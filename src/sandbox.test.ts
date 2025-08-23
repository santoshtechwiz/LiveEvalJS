import { Sandbox } from './sandbox';

describe('Sandbox', () => {
  test('declaration with complex initializer returns value', () => {
    const sb = new Sandbox('test');
    const r = sb.evalExpression('const x = [1,2].map(n => n * 2);');
    expect(r.isError).toBe(false);
    // initializer should return the array value
    const r2 = sb.evalExpression('x');
    expect(r2.isError).toBe(false);
    expect(r2.value).toEqual([2,4]);
  });

  test('console capture works per-line', () => {
    const sb = new Sandbox('test');
    sb.evalExpression("console.log('hello', 1);");
    const out = sb.readConsole();
    expect(out.length).toBeGreaterThan(0);
    expect(out.join(' ')).toMatch(/hello/);
  });
});
