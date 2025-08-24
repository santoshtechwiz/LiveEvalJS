const vm = require('vm');
const util = require('util');

// Simple worker process that evaluates provided JS code inside a Node VM
// and returns serializable results. Communicates over process.send / process.on('message').

function createSandbox() {
  const consoleBuffer = [];
  const sandbox = {
    console: {
      log: (...args) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')),
      warn: (...args) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')),
      error: (...args) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')),
      info: (...args) => consoleBuffer.push(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' '))
    },
    // safe globals
    Math, Number, String, Boolean, Array, Object, JSON, Date, RegExp
  };
  return { sandbox, consoleBuffer };
}

// Create and reuse a single sandbox/context for the lifetime of the worker so
// re-evaluations can access previously-defined variables and functions.
const { sandbox, consoleBuffer } = createSandbox();
const context = vm.createContext(sandbox);

process.on('message', async (msg) => {
  if (!msg || typeof msg.id !== 'number') return;
  const id = msg.id;
  if (msg.action === 'exec') {
    const code = typeof msg.code === 'string' ? msg.code : '';
    const timeoutMs = typeof msg.timeout === 'number' ? msg.timeout : 1000;
    // clear console buffer for this execution
    consoleBuffer.length = 0;
    try {
      // Try to evaluate as an expression first (to return the last expression result).
      // If that fails due to syntax (e.g. declarations or statements), fall back to running
      // the code as a statement which may produce side-effects stored on the sandbox.
      let result;
      try {
        const exprScript = new vm.Script(`(${code})`, { filename: 'quokka-worker-expr' });
        result = exprScript.runInContext(context, { timeout: timeoutMs });
      } catch (exprErr) {
        const stmtScript = new vm.Script(code, { filename: 'quokka-worker' });
        result = stmtScript.runInContext(context, { timeout: timeoutMs });
      }

      let serialResult;
      try {
        serialResult = JSON.parse(JSON.stringify(result));
      } catch (e) {
        serialResult = util.inspect(result, { depth: 2 });
      }

      if (process.send) process.send({ id, ok: true, result: serialResult, console: Array.from(consoleBuffer) });
    } catch (err) {
      if (process.send) process.send({ id, ok: false, error: { message: err && err.message, stack: err && err.stack }, console: Array.from(consoleBuffer) });
    }
  }
});
