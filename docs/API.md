# API Reference

## Extension API

The Quokka Lite extension exposes a public API that can be used by other extensions or for programmatic control.

### Getting the API

```typescript
import * as vscode from 'vscode';

const extension = vscode.extensions.getExtension('your-name.quokka-lite');
const api = extension?.exports;
```

## Core Classes

### QuokkaLiteExtension

Main extension class that orchestrates all components.

#### Methods

##### `activate(context: vscode.ExtensionContext): Promise<void>`

Activates the extension with all its components.

##### `deactivate(): void`

Deactivates the extension and cleans up resources.

##### `evaluateCurrentFile(): void`

Manually triggers evaluation of the current active editor.

##### `toggleEvaluation(): void`

Toggles auto-evaluation on/off.

##### `clearResults(): void`

Clears all evaluation results and decorations.

### ConfigurationManager

Singleton class for managing extension configuration.

#### Methods

##### `getInstance(): ConfigurationManager`

Gets the singleton instance.

##### `getExecutionConfig(): ExecutionConfig`

Returns current execution configuration.

```typescript
interface ExecutionConfig {
  runtime: 'node' | 'browser' | 'custom';
  timeout: number;
  maxMemoryMB: number;
  enableConsoleRedirection: boolean;
  enableCoverage: boolean;
}
```

##### `getThemeConfig(): ThemeConfig`

Returns current theme configuration.

```typescript
interface ThemeConfig {
  resultColor: string;
  errorColor: string;
  successColor: string;
  consoleColor: string;
  coverageHighlight: string;
}
```

##### `onConfigurationChanged(callback: () => void): vscode.Disposable`

Registers a callback for configuration changes.

### Logger

Singleton logging system with multiple levels.

#### Methods

##### `getInstance(): Logger`

Gets the singleton instance.

##### `debug(message: string, data?: any): void`

Logs debug information.

##### `info(message: string, data?: any): void`

Logs informational messages.

##### `warn(message: string, data?: any): void`

Logs warning messages.

##### `error(message: string, error?: Error): void`

Logs error messages.

### RuntimeManager

Manages different execution environments.

#### Methods

##### `getInstance(): RuntimeManager`

Gets the singleton instance.

##### `getCurrentRuntime(): Runtime`

Gets the currently active runtime.

##### `executeCode(code: string, context?: any): Promise<any>`

Executes code in the current runtime.

##### `clearContext(): void`

Clears the execution context.

### Evaluator

Core evaluation engine with AST parsing and result processing.

#### Methods

##### `constructor(context: vscode.ExtensionContext)`

Creates a new evaluator instance.

##### `evaluateEditor(editor: vscode.TextEditor): Promise<void>`

Evaluates the specified editor.

##### `scheduleEvaluation(editor: vscode.TextEditor): void`

Schedules evaluation with debouncing.

##### `clearResults(editor: vscode.TextEditor): void`

Clears evaluation results for the editor.

## Events

### Configuration Events

```typescript
// Listen for configuration changes
const disposable = configManager.onConfigurationChanged(() => {
  console.log('Configuration updated');
});
```

### Evaluation Events

```typescript
// Listen for evaluation completion
vscode.workspace.onDidChangeTextDocument((event) => {
  // Handle document changes
});
```

## Types

### ExecutionResult

```typescript
interface ExecutionResult {
  line: number;
  column: number;
  value: any;
  type: 'success' | 'error' | 'console';
  executionTime?: number;
  memoryUsage?: number;
}
```

### EvaluationContext

```typescript
interface EvaluationContext {
  document: vscode.TextDocument;
  runtime: Runtime;
  config: ExecutionConfig;
  variables: Map<string, any>;
}
```

### Runtime

```typescript
interface Runtime {
  name: string;
  executeCode(code: string, timeout: number): Promise<any>;
  clearContext(): void;
  getContext(): any;
}
```

## Error Handling

All API methods that can fail return promises that reject with descriptive error messages:

```typescript
try {
  await api.evaluateCode('1 + 2');
} catch (error) {
  console.error('Evaluation failed:', error.message);
}
```

## Performance Considerations

- Use `scheduleEvaluation` instead of `evaluateEditor` for better performance
- Clear context periodically to prevent memory leaks
- Configure appropriate timeouts for long-running operations
- Use debug logging only during development

## Examples

### Custom Evaluation

```typescript
const api = extension?.exports;

// Evaluate custom code
const result = await api.evaluateCode('Math.PI * 2');
console.log(result); // 6.283185307179586

// Clear runtime context
api.clearContext();
```

### Configuration Management

```typescript
const configManager = ConfigurationManager.getInstance();

// Get current configuration
const execConfig = configManager.getExecutionConfig();
console.log(`Timeout: ${execConfig.timeout}ms`);

// Listen for changes
const disposable = configManager.onConfigurationChanged(() => {
  console.log('Config updated');
});
```

### Logging

```typescript
const logger = Logger.getInstance();

logger.info('Starting evaluation');
logger.debug('AST parsed', ast);
logger.warn('Performance degraded');
logger.error('Evaluation failed', error);
```
