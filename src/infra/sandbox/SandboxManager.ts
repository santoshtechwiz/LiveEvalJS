import { ChildProcess, fork } from 'child_process';
import * as path from 'path';

type ExecResult = { ok: boolean; result?: any; error?: { message?: string; stack?: string }; console?: string[] };

export class SandboxManager {
  private proc?: ChildProcess;
  private pending = new Map<number, (res: ExecResult) => void>();
  private counter = 1;

  start(): void {
    if (this.proc && !this.proc.killed) return;
    const workerPath = path.join(__dirname, 'worker.js');
    this.proc = fork(workerPath, [], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
    this.proc.on('message', (msg: any) => {
      if (!msg || typeof msg.id !== 'number') return;
      const cb = this.pending.get(msg.id);
      if (cb) {
        cb({ ok: msg.ok, result: msg.result, error: msg.error, console: msg.console });
        this.pending.delete(msg.id);
      }
    });
    this.proc.on('exit', () => {
      // clear pending with error
      for (const [id, cb] of this.pending.entries()) {
        cb({ ok: false, error: { message: 'worker exited' } });
        this.pending.delete(id);
      }
      this.proc = undefined;
    });
  }

  async execute(code: string, timeout = 1000): Promise<ExecResult> {
    this.start();
    if (!this.proc) return { ok: false, error: { message: 'worker not available' } };
    const id = this.counter++;
    return new Promise<ExecResult>((resolve) => {
      const timer = setTimeout(() => {
        // timeout: kill worker and resolve with error
        try { this.proc && this.proc.kill(); } catch {}
        resolve({ ok: false, error: { message: 'timeout' } });
      }, timeout + 200);

      this.pending.set(id, (res) => {
        clearTimeout(timer);
        resolve(res);
      });

      this.proc!.send({ id, action: 'exec', code, timeout });
    });
  }

  dispose(): void {
    try {
      if (this.proc && !this.proc.killed) this.proc.kill();
    } catch {}
    this.proc = undefined;
    this.pending.clear();
  }
}

export default SandboxManager;
