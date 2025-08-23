import * as vscode from 'vscode';
import { CodeRunner } from './core/CodeRunner';
import { ConfigurationManager } from './core/ConfigurationManager';
import { Logger } from './core/Logger';

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
    this.statusBarItem.command = 'quokka.toggleEvaluation';
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
        id: 'quokka.toggleEvaluation',
        handler: () => this.toggleEvaluation()
      },
      {
        id: 'quokka.clearResults',
        handler: () => this.clearResults()
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
  }

  private setupEventHandlers(): void {
    // Document change handler with debouncing
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && 
          event.document === activeEditor.document && 
          this.shouldEvaluateEditor(activeEditor) &&
          this.isAutoEvaluationEnabled()) {
        this.codeRunner.scheduleEvaluation(activeEditor);
      }
    });

    // Active editor change handler
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.shouldEvaluateEditor(editor) && this.isAutoEvaluationEnabled()) {
        this.codeRunner.scheduleEvaluation(editor);
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

    if (activeEditor && this.shouldEvaluateEditor(activeEditor)) {
      if (config.execution.autoEvaluate) {
        this.statusBarItem.text = '$(play) Quokka';
        this.statusBarItem.color = config.display.theme.successColor;
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

// VS Code extension entry points
export function activate(context: vscode.ExtensionContext) {
  const extension = new QuokkaExtension(context);
  extension.activate();
  return extension;
}

export function deactivate(): void {
  // Handled by QuokkaExtension.deactivate()
}
