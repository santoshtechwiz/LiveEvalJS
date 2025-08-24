import vm from 'vm';
import util from 'util';

// Worker process that evaluates provided JS code inside a Node VM
// and returns serializable results. Communicates over process.send / process.on('message').

type ExecMessage = { id: number; action: 'exec'; code?: string; timeout?: number };
type ExecResult = { id: number; ok: boolean; result?: any; error?: { message?: string; stack?: string }; console?: string[] };

function createSandbox() {
  const consoleBuffer: string[] = [];
  const sandbox: any = {
    console: {
      log: (...args: any[]) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')),
      warn: (...args: any[]) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')),
      error: (...args: any[]) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')),
      info: (...args: any[]) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' '))
    },
    // safe globals
    Math, Number, String, Boolean, Array, Object, JSON, Date, RegExp
  };
  return { sandbox, consoleBuffer };

}

const { sandbox, consoleBuffer } = createSandbox();
const context = vm.createContext(sandbox);

process.on('message', async (msg: ExecMessage | any) => {
  if (!msg || typeof msg.id !== 'number') return;
  const id = msg.id;
  if (msg.action === 'exec') {
    const code = typeof msg.code === 'string' ? msg.code : '';
    const timeoutMs = typeof msg.timeout === 'number' ? msg.timeout : 1000;
    // clear console buffer for this execution
    consoleBuffer.length = 0;
    try {
      let result: any;
      try {
        const exprScript = new vm.Script(`(${code})`, { filename: 'quokka-worker-expr' });
        result = exprScript.runInContext(context, { timeout: timeoutMs });
      } catch (exprErr) {
        const stmtScript = new vm.Script(code, { filename: 'quokka-worker' });
        result = stmtScript.runInContext(context, { timeout: timeoutMs });
      }

      let serialResult: any;
      try {
        serialResult = JSON.parse(JSON.stringify(result));
      } catch (e) {
        serialResult = util.inspect(result, { depth: 2 });
      }

      const res: ExecResult = { id, ok: true, result: serialResult, console: Array.from(consoleBuffer) };
      if (process.send) process.send(res);
    } catch (err: any) {
      const res: ExecResult = { id, ok: false, error: { message: err && err.message, stack: err && err.stack }, console: Array.from(consoleBuffer) };
      if (process.send) process.send(res);
    }
  }
});

export {};
