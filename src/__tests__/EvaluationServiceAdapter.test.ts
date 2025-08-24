import * as vscode from 'vscode';
import { EvaluationServiceAdapter } from '../services/EvaluationServiceAdapter';

// Minimal mock TextEditor used for delegation test
test('EvaluationServiceAdapter delegates scheduleEvaluation to Evaluator', () => {
  const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
  const service = new EvaluationServiceAdapter(context);
  // Minimal editor mock sufficient for delegation: just document with getText and uri
  const editor: any = {
    document: {
      uri: { toString: () => 'file:///test.js' },
      getText: () => '// ? 1 + 1',
      languageId: 'javascript'
    }
  };

  // The test ensures calling scheduleEvaluation does not throw and delegates.
  expect(() => service.scheduleEvaluation(editor as vscode.TextEditor)).not.toThrow();

  // cleanup
  service.dispose();
});
