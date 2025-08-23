// Quick test of the evalExpression function
const { evalExpression, formatValue } = require('./out/extension');
const vm = require('vm');

function createSandbox() {
  const sandbox = Object.create(null);
  sandbox.Math = Math;
  sandbox.JSON = JSON;
  sandbox.console = { log: () => {} };
  return vm.createContext(sandbox);
}

const ctx = createSandbox();

// Test 1: Simple expression
const r1 = evalExpression(ctx, '1 + 2', 1000);
console.log('Test 1 - Simple expression:', r1);

// Test 2: Declaration
const r2 = evalExpression(ctx, 'const a = 5', 1000);
console.log('Test 2 - Declaration:', r2);

// Test 3: Use declared variable
const r3 = evalExpression(ctx, 'a + 1', 1000);
console.log('Test 3 - Use variable:', r3);
