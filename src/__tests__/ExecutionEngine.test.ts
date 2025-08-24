import { ExecutionEngine } from '../core/ExecutionEngine';

describe('ExecutionEngine basic flows', () => {
  let engine: ExecutionEngine;
  const docId = 'test://doc1.js';

  beforeEach(() => {
    engine = new ExecutionEngine();
  });

  test('should persist definitions across executions and capture console output', async () => {
    // 1: define a
    const r1 = await engine.execute(docId, 'const a = 10');
    expect(r1).toBeDefined();
    expect(r1.isError).toBe(false);

    // 2: define factorial
    const factCode = `const fact=(n)=>{if(n===0) return 1; return n*fact(n-1);}`;
    const r2 = await engine.execute(docId, factCode);
    expect(r2.isError).toBe(false);

    // 3: compute f
    const r3 = await engine.execute(docId, 'const f = fact(a)');
    expect(r3.isError).toBe(false);

    // 4: read f as expression
    const r4 = await engine.execute(docId, 'f');
    expect(r4.isError).toBe(false);
    expect(r4.value).toBeDefined();
    expect(typeof r4.value === 'number').toBe(true);
    expect(r4.value).toBe(3628800); // 10! = 3628800

    // 5: console.log(f)
    const r5 = await engine.execute(docId, 'console.log(f)');
    expect(r5.isError).toBe(false);
    // console output should contain the value
    const joined = r5.consoleOutput.join(' ');
    expect(joined).toMatch(/3628800/);
  }, 20000);
});
