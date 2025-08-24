import * as vscode from 'vscode';
import IEvaluationService from '../core/contracts/IEvaluationService';
import Evaluator from '../evaluator';

/**
 * Adapter that implements IEvaluationService by delegating to the existing Evaluator.
 * This provides a stable contract while we incrementally refactor the evaluator implementation.
 */
export class EvaluationServiceAdapter implements IEvaluationService {
  private evaluator: Evaluator;

  constructor(context: vscode.ExtensionContext) {
    // keep existing evaluator behavior
    this.evaluator = new Evaluator(context);
  }

  scheduleEvaluation(editor: vscode.TextEditor): void {
    this.evaluator.scheduleEvaluation(editor);
  }

  evaluateEditor(editor: vscode.TextEditor): Promise<void> {
    return this.evaluator.evaluateEditor(editor);
  }

  clearResults(editor: vscode.TextEditor): void {
    this.evaluator.clearResults(editor);
  }

  dispose(): void {
    try { this.evaluator.dispose(); } catch {}
  }
}

export default EvaluationServiceAdapter;
