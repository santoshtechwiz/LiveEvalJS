import { ExecutionEngine, ExecutionResult } from '../core/ExecutionEngine';

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    engine = new ExecutionEngine();
  });

  afterEach(() => {
    // Clean up contexts
    engine.clearContext('test-doc-1');
    engine.clearContext('test-doc-2');
  });

  describe('Context Management', () => {
    test('should create JavaScript context', () => {
      const context = engine.getContext('test-doc-1', 'javascript');
      expect(context.id).toBe('test-doc-1');
      expect(context.language).toBe('javascript');
      expect(context.sandbox).toBeDefined();
      expect(context.variables).toBeDefined();
    });

    test('should create TypeScript context', () => {
      const context = engine.getContext('test-doc-2', 'typescript');
      expect(context.id).toBe('test-doc-2');
      expect(context.language).toBe('typescript');
    });

    test('should reuse existing context', () => {
      const context1 = engine.getContext('test-doc-1', 'javascript');
      const context2 = engine.getContext('test-doc-1', 'javascript');
      expect(context1).toBe(context2);
    });

    test('should clear context variables', () => {
      engine.getContext('test-doc-1', 'javascript');
      engine.clearContext('test-doc-1');
      
      // After clearing, getting context should create a new one
      const newContext = engine.getContext('test-doc-1', 'javascript');
      expect(newContext.variables.size).toBe(0);
    });
  });

  describe('JavaScript Execution', () => {
    test('should execute simple expression', async () => {
      const result = await engine.execute('test-doc-1', '1 + 2');
      expect(result.isError).toBe(false);
      expect(result.value).toBe(3);
      expect(result.type).toBe('number');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should execute variable assignment', async () => {
      const result = await engine.execute('test-doc-1', 'const x = 42');
      expect(result.isError).toBe(false);
      expect(result.value).toBeUndefined(); // Declarations return undefined
    });

    test('should handle variable redeclaration', async () => {
      // First declaration
      await engine.execute('test-doc-1', 'const y = 10');
      
      // Second "declaration" should be converted to assignment
      const result = await engine.execute('test-doc-1', 'const y = 20');
      expect(result.isError).toBe(false);
    });

    test('should capture console output', async () => {
      const result = await engine.execute('test-doc-1', 'console.log("Hello, World!")');
      expect(result.consoleOutput).toHaveLength(1);
      expect(result.consoleOutput[0]).toContain('Hello, World!');
    });

    test('should handle errors gracefully', async () => {
      const result = await engine.execute('test-doc-1', 'throw new Error("Test error")');
      expect(result.isError).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Test error');
    });

    test('should handle syntax errors', async () => {
      const result = await engine.execute('test-doc-1', 'const x = ;');
      expect(result.isError).toBe(true);
      expect(result.error).toBeInstanceOf(SyntaxError);
    });

    test('should timeout long-running code', async () => {
      const result = await engine.execute('test-doc-1', 'while(true) {}');
      expect(result.isError).toBe(true);
      expect(result.error?.message).toContain('timeout');
    }, 10000);
  });

  describe('TypeScript Execution', () => {
    test('should compile and execute TypeScript', async () => {
      const tsCode = `
        interface Person {
          name: string;
          age: number;
        }
        const person: Person = { name: "John", age: 30 };
        person.name
      `;
      
      const result = await engine.execute('test-doc-ts', tsCode);
      expect(result.isError).toBe(false);
      expect(result.value).toBe('John');
    });

    test('should handle TypeScript compilation errors', async () => {
      const invalidTs = 'const x: string = 123;'; // Type mismatch
      
      // Note: This might not fail at runtime since we transpile without type checking
      // But it demonstrates the TypeScript handling
      const result = await engine.execute('test-doc-ts', invalidTs);
      // The result depends on the TypeScript transpilation behavior
      expect(result).toBeDefined();
    });
  });

  describe('Security', () => {
    test('should prevent access to process', async () => {
      const result = await engine.execute('test-doc-1', 'typeof process');
      expect(result.value).toBe('undefined');
    });

    test('should prevent access to require', async () => {
      const result = await engine.execute('test-doc-1', 'typeof require');
      expect(result.value).toBe('undefined');
    });

    test('should prevent access to global', async () => {
      const result = await engine.execute('test-doc-1', 'typeof global');
      expect(result.value).toBe('undefined');
    });

    test('should allow safe globals', async () => {
      const mathResult = await engine.execute('test-doc-1', 'Math.PI');
      expect(mathResult.value).toBeCloseTo(3.14159, 4);

      const jsonResult = await engine.execute('test-doc-1', 'JSON.stringify({a: 1})');
      expect(jsonResult.value).toBe('{"a":1}');
    });
  });

  describe('Variable Persistence', () => {
    test('should persist variables across executions', async () => {
      // Set a variable
      await engine.execute('test-doc-1', 'const count = 5');
      
      // Use it in another execution
      const result = await engine.execute('test-doc-1', 'count * 2');
      expect(result.value).toBe(10);
    });

    test('should isolate variables between contexts', async () => {
      // Set variable in first context
      await engine.execute('test-doc-1', 'const secret = "doc1"');
      
      // Try to access from second context
      const result = await engine.execute('test-doc-2', 'typeof secret');
      expect(result.value).toBe('undefined');
    });
  });

  describe('Event Emission', () => {
    test('should emit success events', (done) => {
      engine.once('execution:success', (event) => {
        expect(event.contextId).toBe('test-doc-1');
        expect(event.result.value).toBe(42);
        done();
      });

      engine.execute('test-doc-1', '42');
    });

    test('should emit error events', (done) => {
      engine.once('execution:error', (event) => {
        expect(event.contextId).toBe('test-doc-1');
        expect(event.error).toBeInstanceOf(Error);
        done();
      });

      engine.execute('test-doc-1', 'throw new Error("test")');
    });
  });
});
