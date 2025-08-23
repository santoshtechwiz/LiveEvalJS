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
    return { ...this.config };
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
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this.configSection)) {
        const oldConfig = this.config;
        this.config = this.loadConfiguration();
        
        // Emit configuration change event if needed
        vscode.commands.executeCommand('quokka.configurationChanged', {
          oldConfig,
          newConfig: this.config
        });
      }
    });
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
