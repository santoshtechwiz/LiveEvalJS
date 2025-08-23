# Contributing to Quokka Lite

Welcome! We're excited that you want to contribute to Quokka Lite. This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

This project follows a standard code of conduct. Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js** 16.x or higher
- **VS Code** 1.60.0 or higher
- **Git** for version control
- **TypeScript** knowledge (intermediate level)

### First Contribution

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature/fix
4. **Make your changes**
5. **Test thoroughly**
6. **Submit a pull request**

## Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-username/quokka-lite.git
cd quokka-lite
npm install
```

### 2. Development Build

```bash
# Watch mode for continuous compilation
npm run watch

# Single build
npm run compile
```

### 3. Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### 4. Running the Extension

1. Open VS Code in the project directory
2. Press `F5` to launch Extension Development Host
3. Open a JavaScript/TypeScript file in the new window
4. Add `// ?` markers to test functionality

## Architecture

Quokka Lite uses a modular architecture with clear separation of concerns:

```
src/
├── config.ts          # Configuration management
├── logger.ts          # Logging system
├── runtime.ts         # Execution environments
├── evaluator.ts       # Core evaluation logic
├── decorations.ts     # UI decorations
├── extension.ts       # Main extension entry
├── types.ts           # Type definitions
└── __tests__/         # Test files
```

### Key Components

- **ConfigurationManager**: Centralized settings management
- **Logger**: Multi-level logging with VS Code integration
- **RuntimeManager**: Abstracts different execution environments
- **Evaluator**: Core evaluation engine with AST parsing
- **DecorationManager**: Handles all UI decorations
- **QuokkaLiteExtension**: Main orchestration class

## Making Changes

### Feature Development

1. **Create a branch**: `git checkout -b feature/your-feature-name`
2. **Follow the architecture**: Use existing patterns and components
3. **Add tests**: Every new feature needs comprehensive tests
4. **Update documentation**: Keep README and docs current
5. **Test thoroughly**: Manual testing + automated tests

### Bug Fixes

1. **Create a branch**: `git checkout -b fix/issue-description`
2. **Write a failing test**: Reproduce the bug first
3. **Fix the issue**: Minimal changes that address the root cause
4. **Verify the fix**: Ensure tests pass and bug is resolved
5. **Add regression tests**: Prevent the bug from recurring

### Common Development Tasks

#### Adding a New Configuration Option

1. Update `src/types.ts` with the new interface property
2. Add the configuration schema to `package.json`
3. Update `ConfigurationManager` to handle the new setting
4. Add tests for the new configuration
5. Update documentation

#### Adding a New Runtime

1. Implement the `Runtime` interface in `src/runtime.ts`
2. Register the runtime in `RuntimeManager`
3. Add configuration options if needed
4. Write comprehensive tests
5. Update documentation

#### Adding a New Decoration Type

1. Define the decoration in `src/decorations.ts`
2. Add configuration options for styling
3. Update the `DecorationManager` class
4. Test with different themes
5. Update user documentation

## Testing

### Test Structure

```
src/__tests__/
├── core.test.ts           # Core functionality tests
├── evaluator.test.ts      # Evaluator component tests
├── integration.test.ts    # End-to-end tests
└── __mocks__/
    └── vscode.js          # VS Code API mocks
```

### Writing Tests

#### Unit Tests

```typescript
import { ConfigurationManager } from '../config';

describe('ConfigurationManager', () => {
  it('should return default execution config', () => {
    const manager = ConfigurationManager.getInstance();
    const config = manager.getExecutionConfig();
    
    expect(config.runtime).toBe('node');
    expect(config.timeout).toBe(5000);
  });
});
```

#### Integration Tests

```typescript
import * as vscode from 'vscode';
import { QuokkaLiteExtension } from '../extension-new';

describe('Extension Integration', () => {
  it('should evaluate marked lines', async () => {
    const mockContext = createMockContext();
    const extension = new QuokkaLiteExtension();
    
    await extension.activate(mockContext);
    
    // Test evaluation logic
    const result = await extension.evaluateCurrentFile();
    expect(result).toBeDefined();
  });
});
```

### Test Guidelines

- **Cover edge cases**: Test boundary conditions and error scenarios
- **Mock dependencies**: Use mocks for VS Code API and external dependencies
- **Test behavior, not implementation**: Focus on what the code does, not how
- **Use descriptive test names**: `should return error when timeout exceeded`
- **Keep tests focused**: One concept per test

## Submitting Changes

### Pull Request Process

1. **Update documentation**: Ensure all changes are documented
2. **Run the full test suite**: `npm test` must pass
3. **Check TypeScript compilation**: `npm run compile` must succeed
4. **Test manually**: Verify functionality in Extension Development Host
5. **Write a clear PR description**: Explain what and why

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No console errors in Extension Development Host
```

### Review Process

1. **Automated checks**: CI must pass (linting, tests, build)
2. **Code review**: Maintainer will review for quality and fit
3. **Testing**: Manual verification of functionality
4. **Merge**: Once approved, changes will be merged

## Style Guidelines

### TypeScript/JavaScript

- **Use TypeScript**: All new code should be TypeScript
- **Strict typing**: Enable strict mode, avoid `any`
- **Modern syntax**: Use ES2020+ features appropriately
- **Consistent formatting**: Use Prettier/ESLint configuration

```typescript
// Good
interface EvaluationResult {
  line: number;
  value: unknown;
  isError: boolean;
}

// Avoid
const result: any = evaluate();
```

### Code Organization

- **Single responsibility**: Each class/function has one purpose
- **Dependency injection**: Use constructor injection for dependencies
- **Error handling**: Always handle errors gracefully
- **Logging**: Use the Logger class for debugging and monitoring

```typescript
// Good
class Evaluator {
  constructor(
    private configManager: ConfigurationManager,
    private logger: Logger
  ) {}
  
  async evaluate(code: string): Promise<EvaluationResult> {
    try {
      this.logger.debug('Starting evaluation', { code });
      // ... evaluation logic
    } catch (error) {
      this.logger.error('Evaluation failed', error as Error);
      throw error;
    }
  }
}
```

### VS Code Integration

- **Use official APIs**: Stick to documented VS Code Extension API
- **Handle lifecycle**: Properly activate/deactivate resources
- **Respect user settings**: Always check configuration before acting
- **Provide feedback**: Use status bar, notifications appropriately

### Documentation

- **JSDoc comments**: Document all public APIs
- **README updates**: Keep user documentation current
- **Code comments**: Explain complex logic and decisions
- **Examples**: Provide usage examples for new features

```typescript
/**
 * Evaluates JavaScript/TypeScript code with the specified runtime.
 * 
 * @param code - The code to evaluate
 * @param options - Evaluation options including timeout and context
 * @returns Promise resolving to evaluation result
 * @throws {EvaluationError} When code execution fails
 */
async evaluateCode(code: string, options: EvaluationOptions): Promise<EvaluationResult>
```

## Getting Help

### Resources

- **VS Code Extension API**: [Official documentation](https://code.visualstudio.com/api)
- **TypeScript**: [Handbook](https://www.typescriptlang.org/docs/)
- **Jest Testing**: [Documentation](https://jestjs.io/docs/getting-started)
- **Project Issues**: [GitHub Issues](https://github.com/your-name/quokka-lite/issues)

### Contact

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord**: [Community server](https://discord.gg/quokka-lite) for real-time help

## Recognition

Contributors will be recognized in:

- **README.md**: Contributors section
- **Release notes**: Acknowledgment of contributions
- **GitHub**: Contributor graphs and statistics

Thank you for contributing to Quokka Lite! 🎉
