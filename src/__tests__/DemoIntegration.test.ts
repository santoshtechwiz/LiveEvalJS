import { ExecutionEngine } from '../core/ExecutionEngine';

describe('Demo integration with ExecutionEngine', () => {
  let engine: ExecutionEngine;
  const docId = 'test://demo.js';

  const demo = '// Basic variables\n' +
    "const message = 'Hello, Quokka!';\n" +
    'const numbers = [1,2,3,4,5];\n\n' +
    'const sum = numbers.reduce((a,b)=>a+b,0);\n' +
    'const average = sum / numbers.length;\n\n' +
    'function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }\n' +
    'const fib10 = fibonacci(10);\n\n' +
    "const user = { name: 'Developer', age: 30, skills: ['JavaScript','TypeScript','React'] };\n\n" +
    'const doubled = numbers.map(n => n * 2);\n' +
    'const evens = numbers.filter(n => n % 2 === 0);\n\n' +
    'const { name, age } = user;\n' +
    'const [ first, second, ...rest ] = numbers;\n\n' +
  'const greeting = `Hello, ${name}! You are ${age} years old.`;\n\n' +
    'const square = x => x * x;\n' +
    'const squared = numbers.map(square);\n\n' +
    "console.log('demo-console-test');\n\n" +
    'const now = new Date();\n' +
    'const timestamp = Date.now();\n\n' +
    'const jsonString = JSON.stringify(user);\n' +
    'const parsed = JSON.parse(jsonString);\n';

  beforeEach(() => {
    engine = new ExecutionEngine();
  });

  test('executes demo and returns values for marked expressions', async () => {
    const full = await engine.execute(docId, demo);
    expect(full).toBeDefined();

    const msg = await engine.execute(docId, 'message');
    expect(msg.isError).toBe(false);
    expect(msg.value).toBe('Hello, Quokka!');

    const nums = await engine.execute(docId, 'numbers');
    expect(nums.isError).toBe(false);
    expect(Array.isArray(nums.value)).toBe(true);
    expect(nums.value.length).toBe(5);

    const s = await engine.execute(docId, 'sum');
    expect(s.isError).toBe(false);
    expect(s.value).toBe(15);

    const avg = await engine.execute(docId, 'average');
    expect(avg.isError).toBe(false);
    expect(avg.value).toBe(3);

    const f = await engine.execute(docId, 'fib10');
    expect(f.isError).toBe(false);
    expect(Number(f.value)).toBe(55);

    const doubled = await engine.execute(docId, 'doubled');
    expect(doubled.isError).toBe(false);
    expect(Array.isArray(doubled.value)).toBe(true);
    expect(doubled.value[0]).toBe(2);

    const ev = await engine.execute(docId, 'evens');
    expect(ev.isError).toBe(false);
    expect(ev.value).toEqual([2,4]);

    const nm = await engine.execute(docId, 'name');
    expect(nm.isError).toBe(false);
    expect(nm.value).toBe('Developer');

    const greet = await engine.execute(docId, 'greeting');
    expect(greet.isError).toBe(false);
    expect(String(greet.value)).toMatch(/Hello, Developer/);

    const cons = await engine.execute(docId, 'console.log("demo-console-test")');
    // console should be captured by the engine
    expect(cons.isError).toBe(false);
    expect(cons.consoleOutput && cons.consoleOutput.join(' ')).toMatch(/demo-console-test/);
  }, 20000);
});
