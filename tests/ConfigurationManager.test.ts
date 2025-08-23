import { ConfigurationManager, QuokkaConfiguration } from '../src/core/ConfigurationManager';
import * as vscode from 'vscode';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn()
  },
  commands: {
    executeCommand: jest.fn()
  }
}));

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configs: Record<string, any> = {
          'execution.timeout': 5000,
          'execution.autoEvaluate': true,
          'execution.evaluationDelay': 300,
          'execution.supportedLanguages': ['javascript', 'typescript'],
          'display.showTypes': true,
          'display.showExecutionTime': false,
          'display.showConsoleOutput': true,
          'display.maxValueLength': 100,
          'display.theme.successColor': '#51cf66',
          'display.theme.errorColor': '#ff6b6b',
          'display.theme.consoleColor': '#74c0fc',
          'features.enableScratchpad': true,
          'features.enableInlineAnnotations': true,
          'features.enableResultsPanel': true
        };
        return configs[key] !== undefined ? configs[key] : defaultValue;
      })
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockReturnValue({
      dispose: jest.fn()
    });

    configManager = ConfigurationManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration Loading', () => {
    test('should load default configuration', () => {
      const config = configManager.getConfiguration();
      
      expect(config.execution.timeout).toBe(5000);
      expect(config.execution.autoEvaluate).toBe(true);
      expect(config.execution.evaluationDelay).toBe(300);
      expect(config.execution.supportedLanguages).toEqual(['javascript', 'typescript']);
      
      expect(config.display.showTypes).toBe(true);
      expect(config.display.showExecutionTime).toBe(false);
      expect(config.display.showConsoleOutput).toBe(true);
      expect(config.display.maxValueLength).toBe(100);
      
      expect(config.display.theme.successColor).toBe('#51cf66');
      expect(config.display.theme.errorColor).toBe('#ff6b6b');
      expect(config.display.theme.consoleColor).toBe('#74c0fc');
      
      expect(config.features.enableScratchpad).toBe(true);
      expect(config.features.enableInlineAnnotations).toBe(true);
      expect(config.features.enableResultsPanel).toBe(true);
    });

    test('should call VS Code configuration API', () => {
      configManager.getConfiguration();
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('quokka');
    });

    test('should use default values when config missing', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => defaultValue);
      
      const config = configManager.getConfiguration();
      expect(config.execution.timeout).toBe(5000); // default value
      expect(config.display.showTypes).toBe(true); // default value
    });
  });

  describe('Configuration Updates', () => {
    test('should merge configuration updates', () => {
      const updates: Partial<QuokkaConfiguration> = {
        execution: {
          timeout: 10000,
          autoEvaluate: false,
          evaluationDelay: 500,
          supportedLanguages: ['javascript']
        }
      };

      configManager.updateConfiguration(updates);
      const config = configManager.getConfiguration();
      
      expect(config.execution.timeout).toBe(10000);
      expect(config.execution.autoEvaluate).toBe(false);
      expect(config.execution.evaluationDelay).toBe(500);
      expect(config.execution.supportedLanguages).toEqual(['javascript']);
    });

    test('should merge partial updates', () => {
      const updates: Partial<QuokkaConfiguration> = {
        display: {
          showTypes: false,
          showExecutionTime: true,
          showConsoleOutput: true,
          maxValueLength: 200,
          theme: {
            successColor: '#00ff00',
            errorColor: '#ff0000',
            consoleColor: '#0000ff'
          }
        }
      };

      configManager.updateConfiguration(updates);
      const config = configManager.getConfiguration();
      
      expect(config.display.showTypes).toBe(false);
      expect(config.display.showExecutionTime).toBe(true);
      expect(config.display.theme.successColor).toBe('#00ff00');
      
      // Other sections should remain unchanged
      expect(config.execution.timeout).toBe(5000);
      expect(config.features.enableScratchpad).toBe(true);
    });
  });

  describe('Configuration Watching', () => {
    test('should setup configuration watcher', () => {
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    test('should handle configuration changes', () => {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => section === 'quokka')
      };

      const changeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      // Simulate configuration change
      changeHandler(mockEvent);
      
      expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('quokka');
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'quokka.configurationChanged',
        expect.objectContaining({
          oldConfig: expect.any(Object),
          newConfig: expect.any(Object)
        })
      );
    });

    test('should ignore non-quokka configuration changes', () => {
      const mockEvent = {
        affectsConfiguration: jest.fn((section: string) => section !== 'quokka')
      };

      const changeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      // Reset the mock to clear previous calls
      (vscode.commands.executeCommand as jest.Mock).mockClear();
      
      // Simulate non-quokka configuration change
      changeHandler(mockEvent);
      
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Structure', () => {
    test('should return immutable configuration copy', () => {
      const config1 = configManager.getConfiguration();
      const config2 = configManager.getConfiguration();
      
      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same content
    });

    test('should have correct structure', () => {
      const config = configManager.getConfiguration();
      
      expect(config).toHaveProperty('execution');
      expect(config).toHaveProperty('display');
      expect(config).toHaveProperty('features');
      
      expect(config.execution).toHaveProperty('timeout');
      expect(config.execution).toHaveProperty('autoEvaluate');
      expect(config.execution).toHaveProperty('evaluationDelay');
      expect(config.execution).toHaveProperty('supportedLanguages');
      
      expect(config.display).toHaveProperty('showTypes');
      expect(config.display).toHaveProperty('showExecutionTime');
      expect(config.display).toHaveProperty('showConsoleOutput');
      expect(config.display).toHaveProperty('maxValueLength');
      expect(config.display).toHaveProperty('theme');
      
      expect(config.features).toHaveProperty('enableScratchpad');
      expect(config.features).toHaveProperty('enableInlineAnnotations');
      expect(config.features).toHaveProperty('enableResultsPanel');
    });
  });
});
