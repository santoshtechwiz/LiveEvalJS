// Test setup (moved from src/tests/setup.ts)
// Load optional helpers if available
try {
	// jest-extended is optional in some environments
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	require('jest-extended');
} catch (e) {
	// ignore if not installed
}

// Any global mocks or helpers can be initialized here
