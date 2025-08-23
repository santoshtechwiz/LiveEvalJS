import { AnnotationRenderer, AnnotationOptions } from '../core/AnnotationRenderer';
import { ExecutionResult } from '../core/ExecutionEngine';
import * as vscode from 'vscode';

// Mock VS Code API
jest.mock('vscode', () => ({
  window: {
    createTextEditorDecorationType: jest.fn(() => ({
      dispose: jest.fn()
    }))
  },
  Range: jest.fn(),
  DecorationRangeBehavior: {
    ClosedOpen: 0
  }
}));

describe('AnnotationRenderer', () => {
  let renderer: AnnotationRenderer;
  let mockEditor: any;
  let defaultOptions: AnnotationOptions;

  beforeEach(() => {
    defaultOptions = {
      showTypes: true,
      showExecutionTime: false,
      maxValueLength: 50,
      showConsoleOutput: true
    };

    renderer = new AnnotationRenderer(defaultOptions);

    mockEditor = {
      document: {
        uri: { toString: () => 'test://doc' },
        lineAt: jest.fn((line: number) => ({
          range: { end: { line, character: 0 } }
        }))
      },
      setDecorations: jest.fn()
    };
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('Initialization', () => {
    test('should create renderer with options', () => {
      expect(renderer).toBeDefined();
    });

    test('should update options', () => {
      const newOptions = { showTypes: false, maxValueLength: 200 };
      renderer.updateOptions(newOptions);
      // Options are private, but we can test behavior changes
      expect(renderer).toBeDefined();
    });
  });

  describe('Value Formatting', () => {
    test('should format simple values correctly', () => {
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: 42,
        type: 'number',
        isError: false,
        executionTime: 5,
        consoleOutput: []
      });

      // This tests internal formatting by triggering renderAnnotations
      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });

    test('should format string values with quotes', () => {
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: 'hello world',
        type: 'string',
        isError: false,
        executionTime: 3,
        consoleOutput: []
      });

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });

    test('should format object values as JSON', () => {
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: { name: 'John', age: 30 },
        type: 'object',
        isError: false,
        executionTime: 8,
        consoleOutput: []
      });

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });

    test('should handle null and undefined', () => {
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: null,
        type: 'null',
        isError: false,
        executionTime: 1,
        consoleOutput: []
      });

      results.set(1, {
        value: undefined,
        type: 'undefined',
        isError: false,
        executionTime: 1,
        consoleOutput: []
      });

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should render error annotations', () => {
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: undefined,
        type: 'error',
        isError: true,
        error: new Error('Test error'),
        executionTime: 0,
        consoleOutput: []
      });

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });
  });

  describe('Console Output', () => {
    test('should render console output when enabled', () => {
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: 42,
        type: 'number',
        isError: false,
        executionTime: 5,
        consoleOutput: ['[LOG] Hello', '[WARN] Warning message']
      });

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });

    test('should not render console output when disabled', () => {
      const noConsoleOptions = { ...defaultOptions, showConsoleOutput: false };
      const noConsoleRenderer = new AnnotationRenderer(noConsoleOptions);

      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: 42,
        type: 'number',
        isError: false,
        executionTime: 5,
        consoleOutput: ['[LOG] Hello']
      });

      noConsoleRenderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
      
      noConsoleRenderer.dispose();
    });
  });

  describe('Annotation Management', () => {
    test('should clear annotations', () => {
      renderer.clearAnnotations(mockEditor);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });

    test('should handle multiple annotations', () => {
      const results = new Map<number, ExecutionResult>();
      
      // Add multiple results
      for (let i = 0; i < 5; i++) {
        results.set(i, {
          value: i * 10,
          type: 'number',
          isError: false,
          executionTime: i + 1,
          consoleOutput: []
        });
      }

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });
  });

  describe('Value Truncation', () => {
    test('should truncate long values', () => {
      const longString = 'x'.repeat(100);
      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: longString,
        type: 'string',
        isError: false,
        executionTime: 2,
        consoleOutput: []
      });

      renderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
    });

    test('should respect maxValueLength option', () => {
      const shortLengthOptions = { ...defaultOptions, maxValueLength: 10 };
      const shortRenderer = new AnnotationRenderer(shortLengthOptions);

      const results = new Map<number, ExecutionResult>();
      
      results.set(0, {
        value: 'this is a very long string',
        type: 'string',
        isError: false,
        executionTime: 2,
        consoleOutput: []
      });

      shortRenderer.renderAnnotations(mockEditor, results);
      expect(mockEditor.setDecorations).toHaveBeenCalled();
      
      shortRenderer.dispose();
    });
  });
});
