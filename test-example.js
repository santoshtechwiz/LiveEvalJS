const x = 5; // ?
const y = x * 2; // ?

function add(a, b) {
  return a + b; // ?
}

const result = add(3, 4); // ?

console.log('Hello world'); // ?

// Test coverage - this block should be highlighted
if (true) {
  const insideIf = 'covered'; // ?
}

// This should not be highlighted (no marker)
const unmarked = 'no marker';
