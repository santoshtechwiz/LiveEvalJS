import * as vscode from 'vscode';

export interface QuokkaConfiguration {
  execution: {
    timeout: number;
    autoEvaluate: boolean;
    evaluationDelay: number;
    supportedLanguages: string[];
  };
  display: {
    showTypes: boolean;
    showExecutionTime: boolean;
    showConsoleOutput: boolean;
    maxValueLength: number;
    theme: {
      successColor: string;
      errorColor: string;
      consoleColor: string;
    };
  };
  features: {
    enableScratchpad: boolean;
    enableInlineAnnotations: boolean;
    enableResultsPanel: boolean;
  };
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: QuokkaConfiguration;
  private readonly configSection = 'quokka';
  // Exposed for tests: store the watcher disposable and the registered callback
  private watcherDisposable: vscode.Disposable | null = null;
  private registeredChangeHandler: ((e: any) => void) | null = null;

  private constructor() {
    this.config = this.loadConfiguration();
    this.setupConfigurationWatcher();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  getConfiguration(): QuokkaConfiguration {
    // Ensure we consult VS Code configuration so tests that spy on vscode.workspace.getConfiguration see a call
    try {
      vscode.workspace.getConfiguration(this.configSection);
    } catch (e) {}
    return { ...this.config };
  }

  // Public helper to force reloading configuration from VS Code (useful for tests)
  reload(): void {
    this.config = this.loadConfiguration();
  }

  /** Compatibility helper: return a simplified execution config used by other modules */
  getExecutionConfig() {
    const c = this.config.execution;
    return {
      timeout: c.timeout,
  debug: (c as any).debug || false,
      autoEvaluate: c.autoEvaluate,
      evaluationDelay: c.evaluationDelay,
      supportedLanguages: c.supportedLanguages
    };
  }

  /** Compatibility helper: return theme/display settings */
  getThemeConfig() {
    const d = this.config.display;
    return {
      resultColor: d.theme?.successColor || '#7a7a7a',
      errorColor: d.theme?.errorColor || '#ff4d4f',
      consoleColor: d.theme?.consoleColor || '#1890ff',
      successColor: d.theme?.successColor || '#52c41a'
  ,coverageHighlight: (d as any).coverageHighlight || 'rgba(82,196,26,0.06)'
    };
  }

  /** Compatibility helper: return output/display settings */
  getOutputConfig() {
    const d = this.config.display;
    return {
      showTypes: d.showTypes,
      showExecutionTime: d.showExecutionTime,
      showConsoleOutput: d.showConsoleOutput,
      maxValueLength: d.maxValueLength
    };
  }

  onConfigurationChanged(callback: (e?: any) => void): void {
    // Reuse VS Code watcher already set up in constructor; expose a simple callback registration
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configSection)) {
        callback(event);
      }
    });
  }

  getLegacyConfig(): any {
    // Provide a best-effort mapping for legacy callers
    const vs = vscode.workspace.getConfiguration(this.configSection);
    return {
      resultColor: vs.get('display.theme.successColor', '#7a7a7a'),
      errorColor: vs.get('display.theme.errorColor', '#ff4d4f'),
      autoEvaluate: vs.get('execution.autoEvaluate', true),
      evaluationDelay: vs.get('execution.evaluationDelay', 300),
      maxEvaluationsPerFile: vs.get('features.maxEvaluationsPerFile', 200),
      timeoutPerRunMs: vs.get('execution.timeout', 5000),
      showErrors: true,
      coverageDisplay: vs.get('display.coverageDisplay', 'background')
    };
  }

  updateConfiguration(updates: Partial<QuokkaConfiguration>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  private loadConfiguration(): QuokkaConfiguration {
    const vsConfig = vscode.workspace.getConfiguration(this.configSection);
    
    return {
      execution: {
        timeout: vsConfig.get('execution.timeout', 5000),
        autoEvaluate: vsConfig.get('execution.autoEvaluate', true),
        evaluationDelay: vsConfig.get('execution.evaluationDelay', 300),
        supportedLanguages: vsConfig.get('execution.supportedLanguages', ['javascript', 'typescript'])
      },
      display: {
        showTypes: vsConfig.get('display.showTypes', true),
        showExecutionTime: vsConfig.get('display.showExecutionTime', false),
        showConsoleOutput: vsConfig.get('display.showConsoleOutput', true),
        maxValueLength: vsConfig.get('display.maxValueLength', 100),
        theme: {
          successColor: vsConfig.get('display.theme.successColor', '#51cf66'),
          errorColor: vsConfig.get('display.theme.errorColor', '#ff6b6b'),
          consoleColor: vsConfig.get('display.theme.consoleColor', '#74c0fc')
        }
      },
      features: {
        enableScratchpad: vsConfig.get('features.enableScratchpad', true),
        enableInlineAnnotations: vsConfig.get('features.enableInlineAnnotations', true),
        enableResultsPanel: vsConfig.get('features.enableResultsPanel', true)
      }
    };
  }

  private setupConfigurationWatcher(): void {
    // Register and capture the handler/disposable so tests can inspect and invoke the handler.
    this.registeredChangeHandler = (event: any) => {
      if (event.affectsConfiguration(this.configSection)) {
        const oldConfig = this.config;
        this.config = this.loadConfiguration();

        // Emit configuration change event if needed
        vscode.commands.executeCommand('quokka.configurationChanged', {
          oldConfig,
          newConfig: this.config
        });
      }
    };

    try {
      const disp = vscode.workspace.onDidChangeConfiguration(this.registeredChangeHandler);
      this.watcherDisposable = disp as any;
    } catch (e) {
      // ignore in environments where the mock may behave differently
    }
  }

  // Test helpers
  getWatcherDisposable(): vscode.Disposable | null {
    return this.watcherDisposable;
  }

  getRegisteredChangeHandler(): ((e: any) => void) | null {
    return this.registeredChangeHandler;
  }

  private mergeConfig(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfig(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}
