import * as vscode from 'vscode';
import { ExecutionEngine, ExecutionResult } from './ExecutionEngine';
import { AnnotationRenderer } from './AnnotationRenderer';
import { ConfigurationManager } from './ConfigurationManager';
import { Logger } from './Logger';
import { LIVE_MARKER_RE, formatValue, formatError } from '../utils';


export class CodeRunner {
  private executionEngine: ExecutionEngine;
  private annotationRenderer: AnnotationRenderer;
  private configManager: ConfigurationManager;
  private logger: Logger;
  private evaluationTimers = new Map<string, NodeJS.Timeout>();
  private readonly liveMarkerRegex = LIVE_MARKER_RE;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    this.logger = Logger.getInstance();
    this.executionEngine = new ExecutionEngine();
    
    const config = this.configManager.getConfiguration();
    this.annotationRenderer = new AnnotationRenderer({
      showTypes: config.display.showTypes,
      showExecutionTime: config.display.showExecutionTime,
      maxValueLength: config.display.maxValueLength,
      showConsoleOutput: config.display.showConsoleOutput
    });

    this.setupEventHandlers();
  }

  /**
   * Evaluates code in the active editor
   */
  async evaluateActiveEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.logger.warn('No active editor found');
      return;
    }

    await this.evaluateEditor(editor);
  }

  /**
   * Evaluate selected text in the active editor. If no selection, evaluate the current line.
   */
  async evaluateSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.logger.warn('No active editor found');
      return;
    }

    const sel = editor.selection;
    const text = sel && !sel.isEmpty ? editor.document.getText(sel) : editor.document.lineAt(sel.active.line).text;

    if (!text || !text.trim()) {
      this.logger.info('No code selected to evaluate');
      return;
    }

    try {
      const documentId = editor.document.uri.toString();
      const language = editor.document.languageId as 'javascript' | 'typescript';
      // ensure context exists
      this.executionEngine.getContext(documentId, language);
      const result = await this.executionEngine.execute(documentId, text.trim(), sel.active.line);
      // Render a temporary inline annotation for the selection using AnnotationRenderer
      const results = new Map<number, ExecutionResult>();
      results.set(sel.active.line, result as ExecutionResult);
      this.annotationRenderer.renderAnnotations(editor, results);
    } catch (err) {
      this.logger.error('Failed to evaluate selection', err as Error);
      vscode.window.showErrorMessage(`Evaluation failed: ${(err as Error).message}`);
    }
  }

  /**
   * Evaluates code in a specific editor
   */
  async evaluateEditor(editor: vscode.TextEditor): Promise<void> {
    if (!this.isLanguageSupported(editor.document.languageId)) {
      this.logger.info(`Language ${editor.document.languageId} not supported`);
      return;
    }

    const documentId = editor.document.uri.toString();
    const language = editor.document.languageId as 'javascript' | 'typescript';
    
    try {
      // Get execution context
      const context = this.executionEngine.getContext(documentId, language);
      
      // Find lines with live markers
      const linesToEvaluate = this.findLiveMarkerLines(editor.document);
      
      if (linesToEvaluate.length === 0) {
        this.annotationRenderer.clearAnnotations(editor);
        return;
      }

      // Execute the whole document once to populate runtime context. This preserves scope
      // for block-scoped variables and multi-line declarations (matches run-demo helper behavior).
      const results = new Map<number, ExecutionResult>();
      try {
        const fullExec = await this.executionEngine.execute(documentId, editor.document.getText());

        // For each marker, query the appropriate identifier/expression against the same context
        for (const lineInfo of linesToEvaluate) {
          try {
            const raw = lineInfo.code || editor.document.lineAt(lineInfo.lineNumber).text.replace(this.liveMarkerRegex, '').trim();
            let toQuery = raw;

            // Detect declarations and pick identifiers
            const fn = raw.match(/^function\s+([A-Za-z_$][\w$]*)/);
            if (fn) toQuery = fn[1];
            const cls = raw.match(/^class\s+([A-Za-z_$][\w$]*)/);
            if (cls) toQuery = cls[1];
            const simple = raw.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
            if (simple) toQuery = simple[1];
            const objDes = raw.match(/^(?:const|let|var)\s*{([^}]+)}/);
            if (objDes) {
              const parts = objDes[1].split(',').map(p => p.split(':')[0].trim().split('=')[0].trim()).filter(Boolean);
              toQuery = `({ ${parts.join(', ')} })`;
            }
            const arrDes = raw.match(/^(?:const|let|var)\s*\[([^\]]+)\]/);
            if (arrDes) {
              const parts = arrDes[1].split(',').map(p => p.trim().split('=')[0].trim()).filter(Boolean);
              toQuery = `({ ${parts.join(', ')} })`;
            }

            const isConsole = /^\s*console\./.test(raw);

            if (isConsole) {
              // show console outputs captured during full execution
              results.set(lineInfo.lineNumber, {
                value: undefined,
                type: 'console',
                isError: false,
                executionTime: 0,
                consoleOutput: fullExec.consoleOutput || []
              } as ExecutionResult);
            } else {
              const q = await this.executionEngine.execute(documentId, toQuery, lineInfo.lineNumber);
              results.set(lineInfo.lineNumber, q as ExecutionResult);
            }
          } catch (error) {
            this.logger.error(`Failed to execute line ${lineInfo.lineNumber}`, error as Error);
            results.set(lineInfo.lineNumber, {
              value: undefined,
              type: 'error',
              isError: true,
              error: error as Error,
              executionTime: 0,
              consoleOutput: []
            });
          }
        }
      } catch (fullErr) {
        // If the full-document execution failed, fall back to per-line execution as a best-effort
        this.logger.warn('Full document execution failed, falling back to per-line evaluation', fullErr as Error);
        for (const lineInfo of linesToEvaluate) {
          try {
            const result = await this.executionEngine.execute(documentId, lineInfo.code, lineInfo.lineNumber);
            results.set(lineInfo.lineNumber, result);
          } catch (error) {
            this.logger.error(`Failed to execute line ${lineInfo.lineNumber}`, error as Error);
            results.set(lineInfo.lineNumber, {
              value: undefined,
              type: 'error',
              isError: true,
              error: error as Error,
              executionTime: 0,
              consoleOutput: []
            });
          }
        }
      }

      // Render annotations
      this.annotationRenderer.renderAnnotations(editor, results);
        // Prepare a small items summary for status bar updates and results view
        try {
          const itemsForStatus: Array<{ line: number; label: string; value: string; status?: 'ok'|'info'|'error' }> = [];
          for (const [ln, res] of results.entries()) {
            itemsForStatus.push({ line: ln + 1, label: editor.document.lineAt(ln).text.trim(), value: res && res.value !== undefined ? String(res.value) : '', status: res && res.isError ? 'error' : (res && res.covered ? 'ok' : 'info') });
          }
          // Send to extension to update status bar (extension registers this command)
          try { vscode.commands.executeCommand('quokka.updateStatusBarItems', itemsForStatus); } catch {}
        } catch (e) {
          // ignore status bar update errors
        }
      
      this.logger.info(`Evaluated ${linesToEvaluate.length} lines in ${editor.document.fileName}`);
      
    } catch (error) {
      this.logger.error('Failed to evaluate editor', error as Error);
      vscode.window.showErrorMessage(`Quokka evaluation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Schedules evaluation with debouncing
   */
  scheduleEvaluation(editor: vscode.TextEditor): void {
    const documentId = editor.document.uri.toString();
    const config = this.configManager.getConfiguration();
    
    // Clear existing timer
    const existingTimer = this.evaluationTimers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

  // Schedule new evaluation only if the document contains a live marker or a console statement
  const containsMarker = editor.document.getText().split(/\r?\n/).some(l => this.liveMarkerRegex.test(l) || /^\s*console\./.test(l));
    // If alwaysEvaluateAll is enabled, guard against very large files by skipping evaluation
    const cfg = this.configManager.getConfiguration();
    const features = cfg.features || ({} as any);
    const alwaysAll = !!features.alwaysEvaluateAll;
    const maxEval = Number(features.maxEvaluationsPerFile || 200);
    if (alwaysAll) {
      const lineCount = editor.document.lineCount || 0;
      // Skip if file line count vastly exceeds the configured max to avoid performance issues
      if (lineCount > Math.max(1000, maxEval * 10)) {
        this.logger.info(`Skipping always-evaluate for large file (${lineCount} lines)`);
        return;
      }
    }
    if (!containsMarker) {
      // nothing to evaluate, clear any existing annotations
      this.annotationRenderer.clearAnnotations(editor);
      return;
    }

    const timer = setTimeout(() => {
      this.evaluationTimers.delete(documentId);
      this.evaluateEditor(editor);
    }, config.execution.evaluationDelay);

    this.evaluationTimers.set(documentId, timer);
  }

  /**
   * Clears results for an editor
   */
  clearResults(editor: vscode.TextEditor): void {
    const documentId = editor.document.uri.toString();
    this.executionEngine.clearContext(documentId);
    this.annotationRenderer.clearAnnotations(editor);
    this.logger.info(`Cleared results for ${editor.document.fileName}`);
  }

  /**
   * Creates a new scratchpad file
   */
  async createScratchpad(): Promise<void> {
    const content = `// Quokka.js Scratchpad
// Add "// ?" at the end of any line to see its result

// Variables and expressions
const message = 'Hello, Quokka!'; // ?
const numbers = [1, 2, 3, 4, 5]; // ?
const sum = numbers.reduce((a, b) => a + b, 0); // ?

// Functions
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const fib10 = fibonacci(10); // ?

// Objects
const user = {
  name: 'Developer',
  age: 30,
  skills: ['JavaScript', 'TypeScript', 'React']
}; // ?

// Modern JavaScript features
const doubled = numbers.map(n => n * 2); // ?
const evens = numbers.filter(n => n % 2 === 0); // ?

// Async operations
Promise.resolve('Async result').then(console.log); // ?

// Console output
console.log('This appears in console output'); // ?
`;

    try {
      const document = await vscode.workspace.openTextDocument({
        content,
        language: 'javascript'
      });
      
      const editor = await vscode.window.showTextDocument(document);
      
      // Auto-evaluate the scratchpad
      await this.evaluateEditor(editor);
      
      vscode.window.showInformationMessage('Scratchpad created and evaluated!');
    } catch (error) {
      this.logger.error('Failed to create scratchpad', error as Error);
      vscode.window.showErrorMessage('Failed to create scratchpad');
    }
  }

  /**
   * Disposes of resources
   */
  dispose(): void {
    // Clear all timers
    this.evaluationTimers.forEach(timer => clearTimeout(timer));
    this.evaluationTimers.clear();
    
    // Dispose components
    this.annotationRenderer.dispose();
  }

  private setupEventHandlers(): void {
    // Listen for execution events
    this.executionEngine.on('execution:success', (event) => {
      this.logger.debug(`Execution successful for line ${event.line}`, event.result);
    });

    this.executionEngine.on('execution:error', (event) => {
      this.logger.error(`Execution failed for line ${event.line}`, event.error);
    });

    // Listen for configuration changes
    vscode.commands.registerCommand('quokka.configurationChanged', (event) => {
      this.handleConfigurationChange(event.newConfig);
    });
  }

  private handleConfigurationChange(newConfig: any): void {
    // Update annotation renderer options
    this.annotationRenderer.updateOptions({
      showTypes: newConfig.display.showTypes,
      showExecutionTime: newConfig.display.showExecutionTime,
      maxValueLength: newConfig.display.maxValueLength,
      showConsoleOutput: newConfig.display.showConsoleOutput
    });

    this.logger.info('Configuration updated');
  }

  private findLiveMarkerLines(document: vscode.TextDocument): Array<{lineNumber: number, code: string}> {
    const lines: Array<{lineNumber: number, code: string}> = [];
    const cfg = this.configManager.getConfiguration();
    const features = cfg.features || ({} as any);
    const alwaysAll = !!features.alwaysEvaluateAll;
    const maxEval = Number(features.maxEvaluationsPerFile || 200);

    // If alwaysEvaluateAll is enabled, return all non-empty non-comment lines up to a max
    if (alwaysAll) {
      for (let i = 0; i < document.lineCount; i++) {
        if (lines.length >= maxEval) break;
        const line = document.lineAt(i);
        const text = line.text.trim();
        // skip blank lines and single-line comments
        if (!text) continue;
        if (/^\/\//.test(text) || /^\/\*/.test(text)) continue;
        // treat full-line import/export as non-evaluable
        if (/^\s*(import|export)\b/.test(text)) continue;
        lines.push({ lineNumber: i, code: text.replace(this.liveMarkerRegex, '').trim() });
      }
      return lines;
    }

    // Try to use Acorn to find AST nodes that correspond to marked lines. This is much more robust
    // than simple lookbacks because it selects the full declaration/expression node.
    let source = document.getText();
    try {
      // load acorn dynamically so tests without the lib don't break
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const acorn = require('acorn');
      const ast = acorn.parse(source, { ecmaVersion: 'latest', locations: true, sourceType: 'module' });

      // Build line->offset map
      const lineOffsets: number[] = [0];
      for (let i = 0; i < source.length; i++) {
        if (source[i] === '\n') lineOffsets.push(i + 1);
      }

      function locToIndex(loc: {line: number, column: number}) {
        const ln = Math.max(1, loc.line);
        const base = lineOffsets[ln - 1] || 0;
        return base + loc.column;
      }

      // Walk AST and collect nodes
      const nodes: any[] = [];
      (function walk(node: any) {
        if (!node || typeof node.type !== 'string') return;
        nodes.push(node);
        for (const key of Object.keys(node)) {
          const child = node[key];
          if (Array.isArray(child)) child.forEach(c => walk(c));
          else if (child && typeof child.type === 'string') walk(child);
        }
      })(ast);

      // For each line with a marker, find the smallest node that covers that line and extract its source
      for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text;
        const m = this.liveMarkerRegex.exec(lineText);
        const isConsoleLine = /^\s*console\./.test(lineText);
        if (!m && !isConsoleLine) continue;
        const lineNum = i + 1;
        // find candidate nodes that cover this line
        const candidates = nodes.filter(n => n.loc && n.loc.start && n.loc.end && n.loc.start.line <= lineNum && n.loc.end.line >= lineNum);
        if (candidates.length === 0) {
          const code = (m && m[1] ? m[1].trim() : '') || (isConsoleLine ? lineText.trim() : lineText.replace(this.liveMarkerRegex, '').trim());
          if (code) lines.push({ lineNumber: i, code });
          continue;
        }
        // choose the smallest candidate (narrowest range)
        candidates.sort((a, b) => {
          const aRange = (a.loc.end.line - a.loc.start.line) * 1000 + (a.loc.end.column - a.loc.start.column);
          const bRange = (b.loc.end.line - b.loc.start.line) * 1000 + (b.loc.end.column - b.loc.start.column);
          return aRange - bRange;
        });
        const chosen = candidates[0];
        const startIdx = locToIndex(chosen.loc.start);
        const endIdx = locToIndex(chosen.loc.end);
  const code = source.slice(startIdx, endIdx);
  lines.push({ lineNumber: i, code: code.trim() });
      }

      return lines;
    } catch (err) {
      // If Acorn isn't available or parsing failed, fall back to the regex/heuristic method
      // (previous implementation)
      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;
        const m = this.liveMarkerRegex.exec(text);
        if (m) {
          const code = (m[1] || '').trim() || text.replace(this.liveMarkerRegex, '').trim();
          if (code) lines.push({ lineNumber: i, code });
        }
      }
      return lines;
    }
  }

  private isLanguageSupported(languageId: string): boolean {
    const config = this.configManager.getConfiguration();
    return config.execution.supportedLanguages.includes(languageId);
  }
}
