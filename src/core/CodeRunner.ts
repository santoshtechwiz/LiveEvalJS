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

      // Execute each line and collect results
      const results = new Map<number, ExecutionResult>();
      
      for (const lineInfo of linesToEvaluate) {
        try {
          const result = await this.executionEngine.execute(
            documentId, 
            lineInfo.code, 
            lineInfo.lineNumber
          );
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

      // Render annotations
      this.annotationRenderer.renderAnnotations(editor, results);
      
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

    // Schedule new evaluation only if the document contains a live marker
    const containsMarker = editor.document.getText().split(/\r?\n/).some(l => this.liveMarkerRegex.test(l));
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
    
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;
      const m = this.liveMarkerRegex.exec(text);
      if (m) {
        // When using the LIVE_MARKER_RE from utils, capture group 1 contains the code before the marker
        const code = (m[1] || '').trim() || text.replace(this.liveMarkerRegex, '').trim();
        if (code) lines.push({ lineNumber: i, code });
      }
    }
    
    return lines;
  }

  private isLanguageSupported(languageId: string): boolean {
    const config = this.configManager.getConfiguration();
    return config.execution.supportedLanguages.includes(languageId);
  }
}
