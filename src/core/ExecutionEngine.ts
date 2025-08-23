import * as vm from 'vm';
import * as ts from 'typescript';
import { EventEmitter } from 'events';

export interface ExecutionResult {
  value: any;
  type: string;
  isError: boolean;
  error?: Error;
  executionTime: number;
  consoleOutput: string[];
}

export interface ExecutionContext {
  id: string;
  language: 'javascript' | 'typescript';
  sandbox: vm.Context;
  consoleBuffer: string[];
  variables: Map<string, any>;
}

export class ExecutionEngine extends EventEmitter {
  private contexts = new Map<string, ExecutionContext>();
  private readonly timeoutMs: number = 5000;

  constructor() {
    super();
  }

  /**
   * Creates or gets an execution context for a document
   */
  getContext(documentId: string, language: 'javascript' | 'typescript'): ExecutionContext {
    if (this.contexts.has(documentId)) {
      return this.contexts.get(documentId)!;
    }

    const context = this.createContext(documentId, language);
    this.contexts.set(documentId, context);
    return context;
  }

  /**
   * Executes code in the given context
   */
  async execute(contextId: string, code: string, line?: number): Promise<ExecutionResult> {
    const startTime = Date.now();
    const context = this.contexts.get(contextId);
    
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    try {
      // Clear console buffer for this execution
      context.consoleBuffer = [];

      // Compile TypeScript if needed
      let executableCode = code;
      if (context.language === 'typescript') {
        executableCode = this.compileTypeScript(code);
      }

      // Handle variable declarations to avoid redeclaration errors
      executableCode = this.normalizeDeclarations(executableCode, context);

      // Execute the code
      const result = await this.executeInSandbox(executableCode, context);
      
      const executionTime = Date.now() - startTime;
      
      const executionResult: ExecutionResult = {
        value: result,
        type: this.getValueType(result),
        isError: false,
        executionTime,
        consoleOutput: [...context.consoleBuffer]
      };

      this.emit('execution:success', { contextId, line, result: executionResult });
      return executionResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const executionResult: ExecutionResult = {
        value: undefined,
        type: 'error',
        isError: true,
        error: error as Error,
        executionTime,
        consoleOutput: [...context.consoleBuffer]
      };

      this.emit('execution:error', { contextId, line, error, result: executionResult });
      return executionResult;
    }
  }

  /**
   * Clears a context
   */
  clearContext(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (context) {
      context.variables.clear();
      context.consoleBuffer = [];
      // Recreate sandbox
      const newContext = this.createContext(contextId, context.language);
      this.contexts.set(contextId, newContext);
      this.emit('context:cleared', { contextId });
    }
  }

  /**
   * Disposes of a context
   */
  disposeContext(contextId: string): void {
    this.contexts.delete(contextId);
    this.emit('context:disposed', { contextId });
  }

  private createContext(id: string, language: 'javascript' | 'typescript'): ExecutionContext {
    const consoleBuffer: string[] = [];
    
    const sandbox = vm.createContext({
      // Safe globals
      console: {
        log: (...args: any[]) => consoleBuffer.push(this.formatConsoleOutput('log', args)),
        error: (...args: any[]) => consoleBuffer.push(this.formatConsoleOutput('error', args)),
        warn: (...args: any[]) => consoleBuffer.push(this.formatConsoleOutput('warn', args)),
        info: (...args: any[]) => consoleBuffer.push(this.formatConsoleOutput('info', args)),
        debug: (...args: any[]) => consoleBuffer.push(this.formatConsoleOutput('debug', args))
      },
      setTimeout, setInterval, clearTimeout, clearInterval,
      Promise, Array, Object, String, Number, Boolean, Date, RegExp, JSON, Math,
      Map, Set, WeakMap, WeakSet,
      Error, TypeError, ReferenceError, SyntaxError,
      // Prevent access to dangerous APIs
      process: undefined,
      require: undefined,
      module: undefined,
      exports: undefined,
      global: undefined,
      __dirname: undefined,
      __filename: undefined
    });

    return {
      id,
      language,
      sandbox,
      consoleBuffer,
      variables: new Map()
    };
  }

  private compileTypeScript(code: string): string {
    try {
      const result = ts.transpile(code, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true
      });
      return result;
    } catch (error) {
      throw new Error(`TypeScript compilation failed: ${(error as Error).message}`);
    }
  }

  private normalizeDeclarations(code: string, context: ExecutionContext): string {
    // Convert const/let/var declarations to assignments if variable already exists
    const declarationRegex = /^\s*(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(.+)$/;
    const match = code.trim().match(declarationRegex);
    
    if (match) {
      const [, , varName, value] = match;
      if (context.variables.has(varName) || varName in context.sandbox) {
        // Convert to assignment
        return `${varName} = ${value}`;
      } else {
        // Track the variable
        context.variables.set(varName, true);
      }
    }
    
    return code;
  }

  private async executeInSandbox(code: string, context: ExecutionContext): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Execution timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      try {
        const script = new vm.Script(code, { filename: 'quokka-evaluation' });
        const result = script.runInContext(context.sandbox, {
          timeout: this.timeoutMs,
          breakOnSigint: true
        });
        
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private formatConsoleOutput(type: string, args: any[]): string {
    const formatted = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    return `[${type.toUpperCase()}] ${formatted}`;
  }

  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}
