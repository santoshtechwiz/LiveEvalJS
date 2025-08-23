import * as vscode from 'vscode';

export interface ExecutionConfig {
  runtime: 'node' | 'browser' | 'custom';
  customRuntime?: string;
  timeout: number;
  maxMemoryMB: number;
  enableConsoleRedirection: boolean;
  enableCoverage: boolean;
  debug?: boolean;
  autoEvaluate: boolean;
  evaluationDelay: number;
  maxEvaluationsPerFile: number;
}

export interface ThemeConfig {
  resultColor: string;
  errorColor: string;
  consoleColor: string;
  successColor: string;
  warningColor: string;
  coverageHighlight: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface OutputConfig {
  format: 'inline' | 'panel' | 'both';
  showTypes: boolean;
  showExecutionTime: boolean;
  truncateValues: boolean;
  maxValueLength: number;
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private readonly namespace = 'quokkaLite';
  
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  getExecutionConfig(): ExecutionConfig {
    const config = vscode.workspace.getConfiguration(this.namespace);
    return {
      runtime: config.get('execution.runtime', 'node'),
      customRuntime: config.get('execution.customRuntime'),
      timeout: config.get('execution.timeout', 5000),
      maxMemoryMB: config.get('execution.maxMemoryMB', 128),
      enableConsoleRedirection: config.get('execution.enableConsoleRedirection', true),
  debug: config.get('execution.debug', false),
      enableCoverage: config.get('execution.enableCoverage', true),
      autoEvaluate: config.get('behavior.autoEvaluate', true),
      evaluationDelay: config.get('behavior.evaluationDelay', 400),
      maxEvaluationsPerFile: config.get('behavior.maxEvaluationsPerFile', 200)
    };
  }

  getThemeConfig(): ThemeConfig {
    const config = vscode.workspace.getConfiguration(this.namespace);
    return {
      resultColor: config.get('theme.resultColor', '#7a7a7a'),
      errorColor: config.get('theme.errorColor', '#ff4d4f'),
      consoleColor: config.get('theme.consoleColor', '#1890ff'),
      successColor: config.get('theme.successColor', '#52c41a'),
      warningColor: config.get('theme.warningColor', '#faad14'),
      coverageHighlight: config.get('theme.coverageHighlight', 'rgba(82,196,26,0.06)'),
      fontFamily: config.get('theme.fontFamily'),
      fontSize: config.get('theme.fontSize')
    };
  }

  getOutputConfig(): OutputConfig {
    const config = vscode.workspace.getConfiguration(this.namespace);
    return {
      format: config.get('output.format', 'inline'),
      showTypes: config.get('output.showTypes', false),
      showExecutionTime: config.get('output.showExecutionTime', false),
      truncateValues: config.get('output.truncateValues', true),
      maxValueLength: config.get('output.maxValueLength', 100)
    };
  }

  onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(this.namespace) || e.affectsConfiguration('quokkaJsClone')) {
        callback();
      }
    });
  }

  getLegacyConfig(): any {
    // Support legacy quokkaJsClone configuration
    const legacyConfig = vscode.workspace.getConfiguration('quokkaJsClone');
    return {
      resultColor: legacyConfig.get('resultColor', '#7a7a7a'),
      errorColor: legacyConfig.get('errorColor', '#ff4d4f'),
      autoEvaluate: legacyConfig.get('autoEvaluate', true),
      evaluationDelay: legacyConfig.get('evaluationDelay', 500),
      maxEvaluationsPerFile: legacyConfig.get('maxEvaluationsPerFile', 200),
      timeoutPerRunMs: legacyConfig.get('timeoutPerRunMs', 600),
      showErrors: legacyConfig.get('showErrors', true),
      coverageDisplay: legacyConfig.get('coverageDisplay', 'background')
    };
  }
}
