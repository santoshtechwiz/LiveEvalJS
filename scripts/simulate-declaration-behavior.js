// Simulate the extension's VM evaluation behavior to demonstrate redeclaration issues
const vm = require('vm');

function createSandbox() {
  const sandbox = Object.create(null);
  sandbox.Math = Math;
  sandbox.Number = Number;
  sandbox.String = String;
  sandbox.Boolean = Boolean;
  sandbox.Array = Array;
  sandbox.Object = Object;
  sandbox.JSON = JSON;
  sandbox.Date = Date;
  sandbox.RegExp = RegExp;
  sandbox.URL = URL;
  sandbox.BigInt = BigInt;
  sandbox.console = { log: () => {}, warn: () => {}, error: () => {}, info: () => {} };
  return vm.createContext(sandbox, { name: 'simulate' });
}

function runCode(ctx, code) {
  const script = new vm.Script(code);
  return script.runInContext(ctx, { timeout: 1000 });
}

function badFlow() {
  console.log('--- bad flow: run buffered + run current (declaration) -> redeclaration expected');
  const ctx = createSandbox();
  // buffered code contains a declaration
  const buffered = `const a = 1;`;
  // current line is the same declaration (would be executed again)
  const current = `const a = 2;`;
  try {
    runCode(ctx, buffered);
    // running declaration again will throw
    runCode(ctx, current);
    console.log('badFlow: no error (unexpected)');
  } catch (e) {
    console.log('badFlow: caught error as expected ->', e.message.replace(/\n/g, ' '));
  }
}

function safeFlow() {
  console.log('--- safe flow: flush buffered, then run current once (no redeclare)');
  const ctx = createSandbox();
  const buffered = `let x = 1;`;
  const current = `let y = 2;`;
  try {
    // flush buffered first
    runCode(ctx, buffered);
    // run current only once (declaration only once)
    runCode(ctx, current);
    console.log('safeFlow: succeeded');
  } catch (e) {
    console.log('safeFlow: unexpected error ->', e.message.replace(/\n/g, ' '));
  }
}

function declarationTwiceButUsingVar() {
  console.log('--- var redeclare is allowed (var)');
  const ctx = createSandbox();
  try {
    runCode(ctx, 'var z = 1;');
    runCode(ctx, 'var z = 2;');
    console.log('var redeclare: succeeded (no error)');
  } catch (e) {
    console.log('var redeclare: unexpected error ->', e.message.replace(/\n/g, ' '));
  }
}

badFlow();
safeFlow();
declarationTwiceButUsingVar();
