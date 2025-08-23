import * as vm from 'vm';
import * as acorn from 'acorn';
import { formatValue, formatError } from './utils';
import { ConfigurationManager } from './core/ConfigurationManager';
import { Logger } from './core/Logger';

export type EvalResult = { value?: any; isError: boolean; error?: any; producedFromStatement?: boolean };

export class Sandbox {
  private ctx: vm.Context;
  private scriptCache = new Map<string, vm.Script>();
  private readonly cacheSize: number;
  private consoleBuffer: string[] = [];

  constructor(name = 'quokka-js-clone', cacheSize = 100) {
    this.cacheSize = cacheSize;
    this.ctx = vm.createContext(Object.create(null), {
      name,
      codeGeneration: { 
        strings: false, 
        wasm: false 
      }
    });

    // Safe intrinsics
    const safeGlobals = {
      Math, Number, String, Boolean, Array, Object,
      JSON, Date, RegExp, URL, BigInt, Error,
      EvalError, RangeError, ReferenceError, SyntaxError,
      TypeError, URIError, Map, Set, WeakMap, WeakSet,
      Promise, Proxy, Reflect, Intl,
      console: {
        log: (...args: any[]) => { this.consoleBuffer.push(args.map(a => String(a)).join(' ')); },
        warn: (...args: any[]) => { this.consoleBuffer.push(args.map(a => String(a)).join(' ')); },
        error: (...args: any[]) => { this.consoleBuffer.push(args.map(a => String(a)).join(' ')); },
        info: (...args: any[]) => { this.consoleBuffer.push(args.map(a => String(a)).join(' ')); },
        debug: (...args: any[]) => { this.consoleBuffer.push(args.map(a => String(a)).join(' ')); },
        trace: (...args: any[]) => { this.consoleBuffer.push(args.map(a => String(a)).join(' ')); }
      }
    };

    Object.entries(safeGlobals).forEach(([key, value]) => {
      (this.ctx as any)[key] = value;
    });

    // Prevent access to dangerous properties
    Object.defineProperties(this.ctx, {
      process: { value: undefined },
      require: { value: undefined },
      global: { value: undefined },
      module: { value: undefined },
      import: { value: undefined },
      Buffer: { value: undefined },
      eval: { value: undefined },
      Function: { value: undefined }
    });
  }

  private getScript(code: string, filename: string): vm.Script {
    const cacheKey = `${filename}:${code}`;
    if (this.scriptCache.has(cacheKey)) {
      return this.scriptCache.get(cacheKey)!;
    }

    const script = new vm.Script(code, {
      filename,
      lineOffset: 0,
      columnOffset: 0,
      produceCachedData: false
    });

    if (this.scriptCache.size >= this.cacheSize) {
      const firstKey = this.scriptCache.keys().next().value;
      if (firstKey !== undefined) {
        this.scriptCache.delete(firstKey);
      }
    }

    this.scriptCache.set(cacheKey, script);
    return script;
  }

  runScript(code: string, timeoutMs: number = 5000): unknown {
    if (!code?.trim()) return undefined;

    try {
      const script = this.getScript(code, 'quokka-sandbox');
      return script.runInContext(this.ctx, {
        timeout: timeoutMs
      });
    } catch (e) {
      // Rethrow to allow callers to handle and display the error
      throw e;
    }
  }

  evalExpression(expr: string, timeoutMs: number = 1000): EvalResult {
    const cfg = ConfigurationManager.getInstance().getExecutionConfig();
    const logger = Logger.getInstance();
    try {
      if (!expr?.trim()) return { value: undefined, isError: false };

      // Normalize single-variable declarations with initializer into assignments.
      // Example: `const a = 1` -> `a = 1` so the value is stored on the sandbox context
      // and subsequent evaluations won't throw redeclaration errors.
      try {
        const singleDecl = expr.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*)$/);
        if (singleDecl && singleDecl[1] && singleDecl[2] !== undefined) {
          // convert to assignment form
          expr = expr.replace(/^\s*(?:const|let|var)\s+/, '');
        }
      } catch {
        // ignore normalization errors and continue
      }

      // Try expression first
      try {
        const wrappedExpr = `(${expr})`;
        const script = this.getScript(wrappedExpr, 'quokka-expr');
        const value = script.runInContext(this.ctx, { timeout: timeoutMs });
        if (cfg.debug) logger.debug('Sandbox.evalExpression (expression)', { expr, value });
        return { value, isError: false };
      } catch (ex: any) {
        const isSyntax = ex && (ex.name === 'SyntaxError' || (typeof ex.message === 'string' && /Unexpected token/i.test(ex.message)));
        if (isSyntax) {
          // Try AST to detect variable declaration with initializer
          try {
            const ast = acorn.parse(expr, { ecmaVersion: 'latest' }) as any;
            if (ast && ast.body && ast.body.length === 1 && ast.body[0].type === 'VariableDeclaration') {
              const decl = ast.body[0];
              if (decl.declarations && decl.declarations.length > 0) {
                const d = decl.declarations[0];
                if (d.id && d.id.type === 'Identifier' && d.init) {
                  const varName = d.id.name;
                  // After normalization above, `expr` has been converted to an assignment form
                  // (e.g. `a = 1`) so we can run it and read the value from the sandbox context.
                  try {
                    this.runScript(expr, timeoutMs);
                  } catch (runErr) {
                    // If assignment fails for some reason, return the error
                    return { isError: true, error: runErr };
                  }
                  const value = this.read(varName, timeoutMs);
                  if (cfg.debug) logger.debug('Sandbox.evalExpression (declaration -> assignment)', { expr, varName, value });
                  return { value, isError: false };
                }
              }
            }
          } catch {
            // fallthrough
          }

          // Otherwise execute as statement and indicate no inline value
          try {
            this.runScript(expr, timeoutMs);
            if (cfg.debug) logger.debug('Sandbox.evalExpression (statement)', { expr });
            return { value: undefined, isError: false, producedFromStatement: true };
          } catch (runErr: any) {
            if (cfg.debug) logger.debug('Sandbox.evalExpression (statement error)', { expr, error: runErr });
            return { isError: true, error: runErr, producedFromStatement: true };
          }
        }
        // Non-syntax evaluation error
        return { isError: true, error: ex };
      }
    } catch (err: any) {
      return { isError: true, error: err };
    }
  }

  read(name: string, timeoutMs: number = 1000): unknown {
    try {
      if (typeof name !== 'string') return undefined;
      // Prefer direct property access (works for global var assignments)
      try {
        if ((this.ctx as any)[name] !== undefined) return (this.ctx as any)[name];
      } catch {}

      // Safely evaluate the identifier in the same context and return its value if present.
      // Wrap in an IIFE to avoid ReferenceError bubbling.
      try {
        const safeRead = `(function(){ try { return typeof ${name} === 'undefined' ? undefined : ${name}; } catch(e) { return undefined; } })()`;
        const script = this.getScript(safeRead, 'quokka-read');
        return script.runInContext(this.ctx, { timeout: timeoutMs });
      } catch {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }

  public readConsole(): string[] {
    return Array.from(this.consoleBuffer);
  }

  public clearConsole(): void {
    this.consoleBuffer.length = 0;
  }

  dispose(): void {
    this.scriptCache.clear();
    // Clear context references
    Object.keys(this.ctx).forEach(key => {
      try { delete (this.ctx as any)[key]; } catch {}
    });
  }
}