// Jest setup file
process.env.NODE_ENV = 'test';

// Increase default timeout for slower CI environments
(global as any).TEST_TIMEOUT = 10000;
jest.setTimeout(10000);

// load vscode mock if present
try {
  require('./__mocks__/vscode');
} catch (e) {
  // ignore if mock not present
}
