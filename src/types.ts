import * as vscode from 'vscode';

// Core evaluation types
export interface EvaluationResult {
  line: number;
  column: number;
  value: any;
  type: 'success' | 'error' | 'console';
  executionTime?: number;
  memoryUsage?: number;
}

export interface EvaluationContext {
  document: vscode.TextDocument;
  runtime: Runtime;
  config: ExecutionConfig;
  variables: Map<string, any>;
}

// Configuration interfaces
export interface ExecutionConfig {
  runtime: 'node' | 'browser' | 'custom';
  timeout: number;
  maxMemoryMB: number;
  enableConsoleRedirection: boolean;
  enableCoverage: boolean;
}

export interface BehaviorConfig {
  autoEvaluate: boolean;
  evaluationDelay: number;
  maxEvaluationsPerFile: number;
}

export interface ThemeConfig {
  resultColor: string;
  errorColor: string;
  successColor: string;
  consoleColor: string;
  coverageHighlight: string;
}

export interface OutputConfig {
  format: 'inline' | 'panel' | 'both';
  showTypes: boolean;
  showExecutionTime: boolean;
  truncateValues: boolean;
  maxValueLength: number;
}

// Runtime abstraction
export interface Runtime {
  name: string;
  executeCode(code: string, timeout: number): Promise<any>;
  clearContext(): void;
  getContext(): any;
  setVariable(name: string, value: any): void;
  getVariable(name: string): any;
}

// Result tracking
export type ResultStatus = 'ok' | 'error' | 'info' | 'console';

export interface ResultNode {
  line: number;
  code: string;
  result: string;
  status: ResultStatus;
  timestamp: number;
  executionTime?: number;
}

// Evaluation markers
export interface EvaluationMarker {
  line: number;
  code: string;
  kind: 'expr' | 'decl' | 'stmt';
  declaredNames?: string[];
  injectAfterLine?: number;
}

// Console capture
export interface ConsoleMessage {
  level: 'log' | 'error' | 'warn' | 'info';
  args: any[];
  timestamp: number;
  line?: number;
}

// Extension state
export interface ExtensionState {
  isActive: boolean;
  evaluationEnabled: boolean;
  currentRuntime: string;
  lastEvaluationTime: number;
}
