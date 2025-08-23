import { evalExpression, formatValue, formatError, replacerCircular, LIVE_MARKER_RE } from './extension';
import * as vm from 'vm';

function createSandbox() {
  const sandbox: any = Object.create(null);
  sandbox.Math = Math;
  sandbox.JSON = JSON;
  sandbox.console = { log: () => {} };
  return vm.createContext(sandbox);
}

describe('quokka-like utilities', () => {
  test('evalExpression evaluates simple expressions', () => {
    const ctx = createSandbox();
    const r = evalExpression(ctx, '1 + 2', 1000);
    expect(r.isError).toBe(false);
    expect(r.result).toBe('3');
  });

  test('evalExpression handles declarations without crashing', () => {
    const ctx = createSandbox();
    const r1 = evalExpression(ctx, 'const a = 5', 1000);
    expect(r1.isError).toBe(false);
    // declaration returns undefined
    expect(r1.result).toBe('undefined');
    // later expression can read it
    const r2 = evalExpression(ctx, 'a + 1', 1000);
    expect(r2.isError).toBe(false);
    expect(r2.result).toBe('6');
  });

  test('evalExpression returns error for invalid code', () => {
    const ctx = createSandbox();
    const r = evalExpression(ctx, 'throw new Error("fail")', 1000);
    expect(r.isError).toBe(true);
    expect(r.result).toMatch(/Error:/);
  });

  test('formatValue formats circular objects safely', () => {
    const a: any = { name: 'a' };
    a.self = a;
    const formatted = formatValue(a);
    expect(formatted).toMatch(/\[Circular\]/);
  });

  test('formatError returns Error: prefix', () => {
    const err = new Error('boom');
    const s = formatError(err);
    expect(s).toBe('Error: boom');
  });

  test('LIVE_MARKER_RE detects line markers', () => {
    const ok1 = LIVE_MARKER_RE.exec("const x = 1; // ?");
    expect(ok1).not.toBeNull();
    expect((ok1 as RegExpExecArray)[1].trim()).toBe('const x = 1;');

    const ok2 = LIVE_MARKER_RE.exec("let y = 2; /*?*/");
    expect(ok2).not.toBeNull();
    expect((ok2 as RegExpExecArray)[1].trim()).toBe('let y = 2;');

    const no = LIVE_MARKER_RE.exec("const z = 3;");
    expect(no).toBeNull();
  });
});
