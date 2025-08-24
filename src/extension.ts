import * as vscode from 'vscode';
import { CodeRunner } from './core/CodeRunner';
import { ConfigurationManager } from './core/ConfigurationManager';
import { Logger } from './core/Logger';
import ResultsProvider, { registerResultsView } from './resultsProvider';

// Module-level live extension instance for proper deactivate wiring in VS Code
let extensionInstance: QuokkaExtension | undefined;

export class QuokkaExtension {
  private codeRunner: CodeRunner;
  private configManager: ConfigurationManager;
  private logger: Logger;
  private statusBarItem: vscode.StatusBarItem;
  private isActive = false;

  constructor(private context: vscode.ExtensionContext) {
    this.logger = Logger.getInstance();
    this.configManager = ConfigurationManager.getInstance();
    this.codeRunner = new CodeRunner();
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  // Use the command id defined in package.json
  this.statusBarItem.command = 'quokka.toggle';
    this.statusBarItem.tooltip = 'Click to toggle Quokka evaluation';
    this.context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Activates the extension
   */
  activate(): void {
    this.logger.info('Activating Quokka.js extension...');

    try {
      this.registerCommands();
  // Ensure the results view is registered so the view is available to receive results
  try { registerResultsView(this.context); } catch {}
      this.setupEventHandlers();
      this.updateStatusBar();
      
      // Auto-evaluate current editor if applicable
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && this.shouldEvaluateEditor(activeEditor)) {
        this.codeRunner.scheduleEvaluation(activeEditor);
      }

      this.isActive = true;
      this.logger.info('Quokka.js extension activated successfully');
      
    } catch (error) {
      this.logger.error('Failed to activate extension', error as Error);
      vscode.window.showErrorMessage(`Quokka.js activation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Deactivates the extension
   */
  deactivate(): void {
    this.logger.info('Deactivating Quokka.js extension...');

    try {
      this.isActive = false;
      this.codeRunner.dispose();
      this.statusBarItem.dispose();
      this.logger.info('Quokka.js extension deactivated successfully');
    } catch (error) {
      this.logger.error('Error during deactivation', error as Error);
    }
  }

  private registerCommands(): void {
    const commands = [
      {
        id: 'quokka.evaluate',
        handler: () => this.evaluateCurrentFile()
      },
      {
  // package.json exposes 'quokka.toggle' for the status bar. Support that id here.
  id: 'quokka.toggle',
        handler: () => this.toggleEvaluation()
      },
      {
  // align with package.json command id for clearing
  id: 'quokka.clear',
        handler: () => this.clearResults()
      },
      {
        id: 'quokka.clearContext',
        handler: () => {
          const activeEditor = vscode.window.activeTextEditor;
          if (activeEditor) {
            this.codeRunner.clearResults(activeEditor);
            vscode.window.showInformationMessage('Quokka runtime context cleared for current file');
          } else {
            vscode.window.showInformationMessage('No active editor to clear context');
          }
        }
      },
      {
        id: 'quokka.evaluateSelection',
        handler: () => this.codeRunner.evaluateSelection()
      },
      {
        id: 'quokka.createScratchpad',
        handler: () => this.codeRunner.createScratchpad()
      },
      {
        id: 'quokka.showOutput',
        handler: () => this.logger.show()
      }
    ];

    commands.forEach(cmd => {
      const disposable = vscode.commands.registerCommand(cmd.id, cmd.handler);
      this.context.subscriptions.push(disposable);
    });

    // Register a command to receive status items from CodeRunner
    const statusDisposable = vscode.commands.registerCommand('quokka.updateStatusBarItems', (items: Array<{ line: number; label: string; value: string; status?: 'ok'|'info'|'error' }>) => {
      try { updateStatusBarFromItems(items || []); } catch {}
    });
    this.context.subscriptions.push(statusDisposable);
  }

  private setupEventHandlers(): void {
    // Document change handler with debouncing
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && 
          event.document === activeEditor.document && 
          this.shouldEvaluateEditor(activeEditor) &&
          this.isAutoEvaluationEnabled()) {
        // Only schedule if the document contains a live marker to avoid evaluation on unrelated edits
        const text = activeEditor.document.getText();
  if (/\/\/\s*\?|\/\*\s*\?\s*\*\//.test(text) || /\bconsole\./.test(text)) {
          this.codeRunner.scheduleEvaluation(activeEditor);
        }
      }
    });

    // Active editor change handler
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.shouldEvaluateEditor(editor) && this.isAutoEvaluationEnabled()) {
        const text = editor.document.getText();
        if (/\/\/\s*\?|\/\*\s*\?\s*\*\//.test(text) || /\bconsole\./.test(text)) {
          this.codeRunner.scheduleEvaluation(editor);
        }
      }
      this.updateStatusBar();
    });

    this.context.subscriptions.push(
      changeDisposable,
      editorChangeDisposable
    );
  }

  private evaluateCurrentFile(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    if (!this.shouldEvaluateEditor(activeEditor)) {
      vscode.window.showInformationMessage(
        'Current file type is not supported. Supported: JavaScript, TypeScript'
      );
      return;
    }

    this.codeRunner.evaluateActiveEditor();
  }

  private toggleEvaluation(): void {
    const config = this.configManager.getConfiguration();
    const newAutoEvaluate = !config.execution.autoEvaluate;
    
    // Update configuration
    const vsConfig = vscode.workspace.getConfiguration('quokka');
    vsConfig.update('execution.autoEvaluate', newAutoEvaluate, vscode.ConfigurationTarget.Global);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      if (newAutoEvaluate) {
        this.codeRunner.scheduleEvaluation(activeEditor);
        vscode.window.showInformationMessage('Quokka auto-evaluation enabled');
      } else {
        this.codeRunner.clearResults(activeEditor);
        vscode.window.showInformationMessage('Quokka auto-evaluation disabled');
      }
    }
    
    this.updateStatusBar();
  }

  private clearResults(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    this.codeRunner.clearResults(activeEditor);
    vscode.window.showInformationMessage('Results cleared');
  }

  private shouldEvaluateEditor(editor: vscode.TextEditor): boolean {
    const config = this.configManager.getConfiguration();
    return config.execution.supportedLanguages.includes(editor.document.languageId);
  }

  private isAutoEvaluationEnabled(): boolean {
    const config = this.configManager.getConfiguration();
    return config.execution.autoEvaluate;
  }

  private updateStatusBar(): void {
    const activeEditor = vscode.window.activeTextEditor;
    const config = this.configManager.getConfiguration();
    const theme = this.configManager.getThemeConfig();

    if (activeEditor && this.shouldEvaluateEditor(activeEditor)) {
      if (config.execution.autoEvaluate) {
        this.statusBarItem.text = '$(play) Quokka';
        this.statusBarItem.color = theme.successColor;
        this.statusBarItem.tooltip = 'Quokka: Active (click to disable)';
      } else {
        this.statusBarItem.text = '$(debug-pause) Quokka';
        this.statusBarItem.color = '#faad14';
        this.statusBarItem.tooltip = 'Quokka: Paused (click to enable)';
      }
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }
}

// Utility for handling circular references in JSON.stringify

// Minimal status bar helpers for tests and simple control
let _testStatusBarItem: vscode.StatusBarItem | undefined;
export function getStatusBarItem(): vscode.StatusBarItem | undefined {
  if (!_testStatusBarItem) {
    try {
      _testStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
    } catch {
      _testStatusBarItem = undefined;
    }
  }
  return _testStatusBarItem;
}

export function updateStatusBarFromItems(items: Array<{ line: number; label: string; value: string; status?: 'ok'|'info'|'error' }>) {
  const sb = getStatusBarItem();
  if (!sb) return;
  const hasError = items.some(i => i.status === 'error');
  const hasOk = items.some(i => i.status === 'ok');
  if (hasError) {
    sb.text = '$(error) Quokka';
    sb.color = '#ff4d4f';
  } else if (hasOk) {
    sb.text = '$(check) Quokka';
    sb.color = '#52c41a';
  } else {
    sb.text = '$(info) Quokka';
    sb.color = '#faad14';
  }
  // Show a concise tooltip with counts
  const total = items.length;
  const err = items.filter(i => i.status === 'error').length;
  const ok = items.filter(i => i.status === 'ok').length;
  sb.tooltip = `Quokka — ${total} items (${ok} OK, ${err} errors)`;
  sb.show();
}

// VS Code extension entry points
export function activate(context: vscode.ExtensionContext) {
  const extension = new QuokkaExtension(context);
  extension.activate();
  // Keep a module-level reference so deactivate() can call into the instance
  extensionInstance = extension;
  return extension;
}

export function deactivate(): void {
  // Delegate to the live instance if present
  if (extensionInstance) {
    try {
      extensionInstance.deactivate();
    } catch (e) {
      // Best-effort: log if possible
      try { Logger.getInstance().error('Error during extension deactivate', e as Error); } catch {}
    }
    extensionInstance = undefined;
  }
}
