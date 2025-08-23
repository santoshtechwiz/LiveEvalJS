// Quokka.js Demo - Add `// ?` at the end of lines to see results

// Basic variables
const message = 'Hello, Quokka!'; // ?
const numbers = [1, 2, 3, 4, 5]; // ?

// Mathematical operations
const sum = numbers.reduce((a, b) => a + b, 0); // ?
const average = sum / numbers.length; // ?

// Functions
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const fib10 = fibonacci(10); // ?

// Objects and arrays
const user = {
  name: 'Developer',
  age: 30,
  skills: ['JavaScript', 'TypeScript', 'React']
}; // ?

// Modern JavaScript features
const doubled = numbers.map(n => n * 2); // ?
const evens = numbers.filter(n => n % 2 === 0); // ?

// Destructuring
const { name, age } = user; // ?
const [first, second, ...rest] = numbers; // ?

// Template literals
const greeting = `Hello, ${name}! You are ${age} years old.`; // ?

// Arrow functions
const square = x => x * x; // ?
const squared = numbers.map(square); // ?

// Console output
console.log('This will appear in console output'); // ?

// Date and time
const now = new Date(); // ?
const timestamp = Date.now(); // ?

// JSON operations
const jsonString = JSON.stringify(user); // ?
const parsed = JSON.parse(jsonString); // ?

// Error handling example (uncomment to test)
// const error = JSON.parse('invalid json'); // ?
