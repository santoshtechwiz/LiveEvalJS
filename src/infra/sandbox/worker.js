const vm = require('vm');
const util = require('util');

// Simple worker process that evaluates provided JS code inside a Node VM
// and returns serializable results. Communicates over process.send / process.on('message').

function createSandbox() {
  const consoleBuffer = [];
  const sandbox = {
    console: {
      log: (...args) => consoleBuffer.push(String(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')))),
      warn: (...args) => consoleBuffer.push(String(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')))),
      error: (...args) => consoleBuffer.push(String(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' ')))),
      info: (...args) => consoleBuffer.push(String(args.map(a => (typeof a === 'string' ? a : util.inspect(a))).join(' '))))
    },
    // safe globals
    Math, Number, String, Boolean, Array, Object, JSON, Date, RegExp
  };
  return { sandbox, consoleBuffer };
}

process.on('message', async (msg) => {
  if (!msg || !msg.id) return;
  const id = msg.id;
  if (msg.action === 'exec') {
    const code = msg.code || '';
    const timeoutMs = typeof msg.timeout === 'number' ? msg.timeout : 1000;
    const { sandbox, consoleBuffer } = createSandbox();
    try {
      const script = new vm.Script(code, { filename: 'quokka-worker' });
      const context = vm.createContext(sandbox);
      const result = script.runInContext(context, { timeout: timeoutMs });
      // send back util.inspect result if not JSON-serializable
      let serialResult;
      try {
        serialResult = JSON.parse(JSON.stringify(result));
      } catch (e) {
        serialResult = util.inspect(result, { depth: 2 });
      }
      process.send({ id, ok: true, result: serialResult, console: consoleBuffer });
    } catch (err) {
      process.send({ id, ok: false, error: { message: err && err.message, stack: err && err.stack }, console: consoleBuffer });
    }
  }
});
