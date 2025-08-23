import * as vscode from 'vscode';
import { LIVE_MARKER_RE, formatValue, formatError } from './utils';
import RuntimeManager from './runtime';
import { Sandbox, EvalResult } from './sandbox';
import { DecorationManager } from './decorations';
import ResultsProvider, { ResultItem } from './resultsProvider';
import { EvaluationMarker } from './types';
import { ConfigurationManager } from './config';

export class Evaluator {
  private decorationManager = DecorationManager.getInstance();
  private runtimeManager = RuntimeManager;
  private config = ConfigurationManager.getInstance();
  private sandboxes = new Map<string, Sandbox>();
  // Per-document evaluation debounce timers
  private evalTimers = new Map<string, NodeJS.Timeout>();

  constructor(private context: vscode.ExtensionContext) {}

  public dispose() {
    // cleanup if needed
  }

  public scheduleEvaluation(editor: vscode.TextEditor) {
    // Debounce briefly using the configured evaluationDelay (not the execution timeout)
    try {
      const key = editor.document.uri.toString();
      const delay = this.config.getExecutionConfig().evaluationDelay ?? 200;
      // clear any existing timer for this document
      const existing = this.evalTimers.get(key);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        this.evalTimers.delete(key);
        this.evaluateEditor(editor);
      }, delay);
      this.evalTimers.set(key, t);
    } catch (e) {
      // Fallback to a simple schedule if something goes wrong
      setTimeout(() => this.evaluateEditor(editor), 200);
    }
  }

  public async evaluateEditor(editor: vscode.TextEditor): Promise<void> {
    try {
      const cfg = this.config.getExecutionConfig();
      const logger = (global as any).quokkaLogger || (require('./logger').Logger.getInstance());
      if (cfg.debug) logger.debug('Evaluator.evaluateEditor start', { uri: editor.document.uri.toString() });
      const doc = editor.document;
      const text = doc.getText();
      const lines = text.split(/\r?\n/);
      const uriKey = doc.uri.toString();
      let sandbox = this.sandboxes.get(uriKey);
      if (!sandbox) {
        sandbox = new Sandbox(uriKey);
        this.sandboxes.set(uriKey, sandbox);
      }

  const resultDecorations: vscode.DecorationOptions[] = [];
  const errorDecorations: vscode.DecorationOptions[] = [];
  const gutterOkDecorations: vscode.DecorationOptions[] = [];
  const gutterErrorDecorations: vscode.DecorationOptions[] = [];
  const coverageBackgroundDecorations: vscode.DecorationOptions[] = [];
  const coverageGutterDecorations: vscode.DecorationOptions[] = [];
  const resultsForView: ResultItem[] = [];

      const isTs = (doc.languageId || '').toLowerCase().includes('typescript');
      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const markerMatch = LIVE_MARKER_RE.exec(lineText);
        if (markerMatch) {
          let code = (markerMatch[1] || '').trim();
          // If TypeScript, transpile the single-line snippet to JS before evaluating
          if (isTs && code) {
            try {
              // dynamic require to avoid hard dependency at runtime if not present
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const ts = require('typescript');
              const out = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: false });
              if (out && out.outputText) code = out.outputText.trim();
            } catch (tsErr) {
              // if transpile fails, fall back to original code and let sandbox surface errors
            }
          }
          try {
            const res: EvalResult = sandbox.evalExpression(code, this.config.getExecutionConfig().timeout);
            const lineRange = editor.document.lineAt(i).range;
            const consoleOutput = sandbox.readConsole();
            // Clear console buffer for next line
            sandbox.clearConsole();
            if (res.isError) {
              // single error decoration with error styling
              errorDecorations.push(this.makeAfterDecoration(editor, i, formatError(res.error || 'Error'), 'error'));
              // Gutter error
              gutterErrorDecorations.push({ range: lineRange });
              resultsForView.push({ line: i + 1, label: editor.document.lineAt(i).text.trim(), value: String(res.error || 'Error'), status: 'error', console: consoleOutput });
            } else if (res.producedFromStatement) {
              // Statement-only execution (e.g., declarations) — do not show a right-hand decoration, but still record an info gutter
              gutterOkDecorations.push({ range: lineRange });
              resultsForView.push({ line: i + 1, label: editor.document.lineAt(i).text.trim(), value: '', status: 'info' });
            } else {
              // single result decoration with result styling
              resultDecorations.push(this.makeAfterDecoration(editor, i, formatValue(res.value), 'result'));
              // if there was console output, show it inline as well (small, secondary)
              if (consoleOutput && consoleOutput.length) {
                const joined = consoleOutput.join(' | ');
                // attach console decoration after the result
                resultDecorations.push(this.makeAfterDecoration(editor, i, joined, 'console'));
              }
              // Determine if this line should be considered 'covered' (function definitions or arrow functions)
              const text = editor.document.lineAt(i).text;
              const isFunction = /function\s+\w+\s*\(|=>/.test(text);
              if (isFunction) {
                coverageBackgroundDecorations.push({ range: lineRange });
                coverageGutterDecorations.push({ range: lineRange });
                // Mark gutter success as well
                gutterOkDecorations.push({ range: lineRange });
              } else {
                // Non-function successful evaluation: mark small success gutter
                gutterOkDecorations.push({ range: lineRange });
              }
              resultsForView.push({ line: i + 1, label: text.trim(), value: String(res.value), status: isFunction ? 'ok' : 'info', console: consoleOutput });
            }
          } catch (err) {
            errorDecorations.push(this.makeAfterDecoration(editor, i, formatError(err), 'error'));
          }
        }
      }

  // Clear previous decorations
  this.decorationManager.clearAllDecorations(editor);
      // Apply new decorations
  if (resultDecorations.length) this.decorationManager.setDecorations(editor, 'result', resultDecorations);
  if (errorDecorations.length) this.decorationManager.setDecorations(editor, 'error', errorDecorations);
  if (gutterOkDecorations.length) this.decorationManager.setDecorations(editor, 'gutterOk', gutterOkDecorations);
  if (gutterErrorDecorations.length) this.decorationManager.setDecorations(editor, 'gutterError', gutterErrorDecorations);
  if (coverageBackgroundDecorations.length) this.decorationManager.setDecorations(editor, 'coverageBackground', coverageBackgroundDecorations);
  if (coverageGutterDecorations.length) this.decorationManager.setDecorations(editor, 'coverageGutter', coverageGutterDecorations);
  // Always log counts so users can see decorations were attempted
  logger.info('Applied decorations', { results: resultDecorations.length, errors: errorDecorations.length, gutterOk: gutterOkDecorations.length, gutterError: gutterErrorDecorations.length, coverage: coverageBackgroundDecorations.length });
      try {
        // Log a summary so users can see what will be sent to the results view
        try {
          logger.info('Results prepared for view', { uri: uriKey, count: resultsForView.length, sample: resultsForView.slice(0, 5) });
        } catch (logErr) {
          // ignore logging issues
        }
        ResultsProvider.getInstance().setResults(editor.document.uri.toString(), resultsForView);
      } catch (e) {}
  if (cfg.debug) logger.debug('Evaluator.evaluateEditor end', { resultCount: resultDecorations.length, errorCount: errorDecorations.length });
    } catch (err) {
      // Log to output channel
      console.error('Evaluation failed', err);
    }
  }

  public clearResults(editor: vscode.TextEditor) {
    this.decorationManager.clearAllDecorations(editor);
    // reset sandbox for this document so subsequent evaluations start fresh
    const key = editor.document.uri.toString();
    const sb = this.sandboxes.get(key);
    if (sb) {
      sb.dispose();
      this.sandboxes.delete(key);
    }
  }

  private makeAfterDecoration(editor: vscode.TextEditor, line: number, text: string, kind: 'result' | 'error' | 'console' = 'result'): vscode.DecorationOptions {
    const lineEnd = editor.document.lineAt(line).range.end;
    const theme = ConfigurationManager.getInstance().getThemeConfig();
    const successColor = theme.successColor || '#52c41a';
    const color = kind === 'error' ? (theme.errorColor || '#ff4d4f') : (theme.resultColor || '#7a7a7a');
    const borderColor = kind === 'error' ? (theme.errorColor || '#ff4d4f') : successColor;
    return {
      range: new vscode.Range(lineEnd, lineEnd),
      renderOptions: { after: { contentText: ` ${text}`, color, backgroundColor: 'rgba(0,0,0,0.08)', border: `1px solid ${borderColor}`, borderRadius: '3px', fontWeight: '600' } }
    } as vscode.DecorationOptions;
  }
}

export default Evaluator;
