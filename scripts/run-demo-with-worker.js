const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const workerPath = path.join(__dirname, '..', 'src', 'infra', 'sandbox', 'worker.js');
const demoPath = path.join(__dirname, '..', 'demo.js');

if (!fs.existsSync(workerPath)) {
  console.error('worker.js not found at', workerPath);
  process.exit(1);
}
if (!fs.existsSync(demoPath)) {
  console.error('demo.js not found at', demoPath);
  process.exit(1);
}

const worker = fork(workerPath, [], { stdio: ['pipe','pipe','pipe','ipc'] });

function exec(code, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 0xffffffff);
    const onMsg = (msg) => {
      if (!msg || msg.id !== id) return;
      worker.off('message', onMsg);
      resolve(msg);
    };
    worker.on('message', onMsg);
    worker.send({ id, action: 'exec', code, timeout });
    // safety timeout
    setTimeout(() => {
      worker.off('message', onMsg);
      resolve({ id, ok: false, error: { message: 'timeout' }, console: [] });
    }, timeout + 500);
  });
}

(async () => {
  const demo = fs.readFileSync(demoPath, 'utf8');
  const lines = demo.split(/\r?\n/);
  console.log('Running demo.js with worker -- collecting // ? results');

  // First: execute the whole file once to populate the persistent worker context
  console.log('Executing entire file to build runtime context...');
  const fullExec = await exec(demo);
  if (!fullExec.ok) {
    console.log('Full execution error:', fullExec.error && fullExec.error.message);
  }

  // Now evaluate each marked line against the same context
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const markerIndex = line.indexOf('// ?');
    if (markerIndex < 0) continue;

    const before = line.replace('// ?', '').trim();
    // Determine what to evaluate: if a declaration, pick the declared identifier(s). Otherwise evaluate the expression itself.
    let toQuery = before;
    // function declaration
    const fn = before.match(/^function\s+([A-Za-z_$][\w$]*)/);
    if (fn) toQuery = fn[1];
    // class declaration
    const cls = before.match(/^class\s+([A-Za-z_$][\w$]*)/);
    if (cls) toQuery = cls[1];
    // simple var/let/const
    const simple = before.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
    if (simple) toQuery = simple[1];
    // object destructuring
    const objDes = before.match(/^(?:const|let|var)\s*{([^}]+)}/);
    if (objDes) {
      const parts = objDes[1].split(',').map(p => p.split(':')[0].trim().split('=')[0].trim()).filter(Boolean);
      toQuery = `({ ${parts.join(', ')} })`;
    }
    // array destructuring
    const arrDes = before.match(/^(?:const|let|var)\s*\[([^\]]+)\]/);
    if (arrDes) {
      const parts = arrDes[1].split(',').map(p => p.trim().split('=')[0].trim()).filter(Boolean);
      toQuery = `({ ${parts.join(', ')} })`;
    }

    // For console.log(...) lines, don't re-evaluate; show console captured during full execution if present
    const isConsole = /^\s*console\./.test(before);

    console.log('---');
    console.log(`Line ${i+1}: ${line.trim()}`);
    try {
      if (isConsole) {
        if (fullExec && fullExec.console && fullExec.console.length) console.log('  Console:', fullExec.console.join(' | '));
        else console.log('  Result: (no console output)');
        continue;
      }

      const q = await exec(toQuery);
      if (!q.ok) {
        console.log('  Error:', q.error && q.error.message);
      } else {
        console.log('  Result:', q.result);
        if (q.console && q.console.length) console.log('  Console:', q.console.join(' | '));
      }
    } catch (e) {
      console.log('  Error evaluating marker:', e && e.message);
    }
  }
  worker.kill();
})();
