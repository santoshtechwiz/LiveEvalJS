import SandboxManager from '../infra/sandbox/SandboxManager';

describe('SandboxManager', () => {
  let s: SandboxManager;
  beforeEach(() => {
    s = new SandboxManager();
  });
  afterEach(() => {
    s.dispose();
  });

  test('executes simple code and captures console', async () => {
    const r = await s.execute("(function(){ console.log('hello'); return 2+3 })()", 1000);
    expect(r.ok).toBe(true);
    expect(r.result).toBeDefined();
    expect(r.console && r.console.length > 0).toBeTruthy();
  });

  test('times out for long running code', async () => {
    const r = await s.execute("while(true){}", 200);
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  // Depending on Node/vm behavior we may get different messages; accept common variants
  expect(r.error && String(r.error.message)).toMatch(/timeout|worker exited|timed out/i);
  }, 10000);
});
