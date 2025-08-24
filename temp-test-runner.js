const { fork } = require('child_process');
const path = require('path');

const worker = fork(path.join(__dirname, 'src', 'infra', 'sandbox', 'worker.js'), [], { stdio: ['pipe','pipe','pipe','ipc'] });

function exec(code, timeout=1000) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random()*1000000);
    function onMsg(msg){
      if(msg && msg.id === id){
        worker.off('message', onMsg);
        resolve(msg);
      }
    }
    worker.on('message', onMsg);
    worker.send({ id, action: 'exec', code, timeout });
  });
}

(async () => {
  console.log('Defining a = 10');
  const r1 = await exec('const a = 10');
  console.log('Result 1:', r1);
  const r2 = await exec('a');
  console.log('Result 2:', r2);
  worker.kill();
})();
