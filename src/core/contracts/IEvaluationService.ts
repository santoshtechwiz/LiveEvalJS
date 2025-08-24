import * as vscode from 'vscode';
import { EvalResult } from '../models/EvalResult';

/**
 * Minimal evaluation service contract for orchestrating live evaluation.
 */
export interface IEvaluationService {
  scheduleEvaluation(editor: vscode.TextEditor): void;
  evaluateEditor(editor: vscode.TextEditor): Promise<void>;
  clearResults(editor: vscode.TextEditor): void;
  dispose(): void;
}

export default IEvaluationService;
