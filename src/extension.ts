// Copyright (c) 2025.
// Production-ready "Quokka-like" inline evaluator for JS with live comments.
// - NO new components/files required by the user; this replaces extension.ts.
// - Evaluates ONLY lines marked with live-comment markers: `// ?` or `/*?*/`
// - Uses Node's `vm` with a fresh, safe-ish context per evaluation pass.
// - Adds inline decorations for results and errors.
// - Debounced updates; respects user config under `quokkaJsClone.*`.

import * as vscode from 'vscode';
import * as vm from 'vm';
import * as acorn from 'acorn';

// Sidebar result types
type ResultStatus = 'ok' | 'info' | 'error';
interface ResultNode { line: number; label: string; value: string; status: ResultStatus }

/**
 * Minimal tree provider for showing evaluation results in the sidebar.
 */
class ResultsProvider implements vscode.TreeDataProvider<ResultNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<ResultNode | undefined | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<ResultNode | undefined | void> = this._onDidChangeTreeData.event;
  private items: ResultNode[] = [];

  pushResult(n: ResultNode) { this.items.push(n); }
  getItems() { return this.items; }
  clear() { this.items = []; }
  refresh(): void { this._onDidChangeTreeData.fire(); }

  getTreeItem(element: ResultNode): vscode.TreeItem {
    const ti = new vscode.TreeItem(`${element.line}: ${element.label}`);
    ti.description = element.value;
    ti.iconPath = this.iconForStatus(element.status);
    return ti;
  }

  getChildren(): ResultNode[] { return this.items; }

  private iconForStatus(status: ResultStatus): vscode.Uri {
    // small colored circle svgs as data URIs
    const svg = (color: string) => `data:image/svg+xml;utf8,` + encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'>
        <circle cx='6' cy='6' r='5' fill='${color}' />
      </svg>`);
    if (status === 'ok') return vscode.Uri.parse(svg('#52c41a'));
    if (status === 'info') return vscode.Uri.parse(svg('#faad14'));
    return vscode.Uri.parse(svg('#ff4d4f'));
  }
}

// -----------------------------
// Configuration namespace
// All user-configurable settings live under this key (see README / package.json when packaging)
const CONFIG_NS = 'quokkaJsClone';

type EvalResult = { result: string; isError: boolean };

let outputDecorationType: vscode.TextEditorDecorationType | undefined;
let errorDecorationType: vscode.TextEditorDecorationType | undefined;
let gutterOkDecoration: vscode.TextEditorDecorationType | undefined;
let gutterInfoDecoration: vscode.TextEditorDecorationType | undefined;
let gutterErrorDecoration: vscode.TextEditorDecorationType | undefined;
let coverageDecoration: vscode.TextEditorDecorationType | undefined;
let coverageBackgroundDecoration: vscode.TextEditorDecorationType | undefined;
let isEvaluationEnabled = true;
const evaluationTimeouts = new Map<string, NodeJS.Timeout | undefined>();
let resultsProvider: ResultsProvider | undefined;
let resultsView: vscode.TreeView<ResultNode> | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

// RegEx to detect a live-comment marker (`// ?` or `/*?*/`) optionally anywhere on the line.
// Captures everything before the marker in group 1.
const LIVE_MARKER_RE = /^(.*?)(?:\s*(?:\/\/\s*\?|\/\*\s*\?\s*\*\/))\s*$/;

// -----------------------------
// Decorations
function createDecorationTypes() {
  const config = vscode.workspace.getConfiguration(CONFIG_NS);
  const resultColor = config.get<string>('resultColor', '#7a7a7a'); // neutral
  const errorColor = config.get<string>('errorColor', '#ff4d4f');   // red-ish

  outputDecorationType?.dispose();
  errorDecorationType?.dispose();
  gutterOkDecoration?.dispose();
  gutterInfoDecoration?.dispose();
  gutterErrorDecoration?.dispose();
  coverageDecoration?.dispose();
  coverageBackgroundDecoration?.dispose();

  outputDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      margin: '0 0 0 2.5em',
      textDecoration: 'none',
      color: resultColor,
      fontStyle: 'italic',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
  });

  errorDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      margin: '0 0 0 2.5em',
      textDecoration: 'none',
      color: errorColor,
      fontStyle: 'italic',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
  });

  // small colored dot in the gutter (left side) like Quokka
  // smaller dots (8x8) to avoid oversized icons in the gutter
  // very small dots (3x3) and explicit small gutter size
  const makeDotUri = (color: string) => vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='3' height='3' viewBox='0 0 3 3'><circle cx='1.5' cy='1.5' r='1.2' fill='${color}' /></svg>`)}`);

  // Use a smaller gutterIconSize to keep icons subtle
  gutterOkDecoration = vscode.window.createTextEditorDecorationType({ gutterIconPath: makeDotUri('#52c41a'), gutterIconSize: '6px', rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen });
  gutterInfoDecoration = vscode.window.createTextEditorDecorationType({ gutterIconPath: makeDotUri('#faad14'), gutterIconSize: '6px', rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen });
  gutterErrorDecoration = vscode.window.createTextEditorDecorationType({ gutterIconPath: makeDotUri('#ff4d4f'), gutterIconSize: '6px', rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen });

  // coverage block (narrow vertical bar) shown per-line when executed; stacking forms a block
  const makeBlockUri = (color: string) => vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='4' height='14' viewBox='0 0 4 14'><rect x='0' y='1' width='4' height='12' fill='${color}' rx='1' /></svg>`)}`);
  coverageDecoration = vscode.window.createTextEditorDecorationType({ gutterIconPath: makeBlockUri('#52c41a'), gutterIconSize: 'auto', rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen });

  // subtle background highlight for covered lines (default)
  coverageBackgroundDecoration = vscode.window.createTextEditorDecorationType({ isWholeLine: true, backgroundColor: 'rgba(82,196,26,0.06)', rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen });

  // no inline fallback; rely on gutter icons for compact display
}

// -----------------------------
// Safe(ish) evaluation
function createSandbox(): vm.Context {
  // Very minimal sandbox: no access to process/require/global by default.
  const sandbox: Record<string, unknown> = Object.create(null);
  // Provide basic globals that are typically safe for pure evaluation:
  sandbox.Math = Math;
  sandbox.Number = Number;
  sandbox.String = String;
  sandbox.Boolean = Boolean;
  sandbox.Array = Array;
  sandbox.Object = Object;
  sandbox.JSON = JSON;
  sandbox.Date = Date;
  sandbox.RegExp = RegExp;
  sandbox.URL = URL;
  sandbox.BigInt = BigInt;
  sandbox.setTimeout = undefined;
  sandbox.setInterval = undefined;
  sandbox.clearTimeout = undefined;
  sandbox.clearInterval = undefined;
  sandbox.console = {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {},
  };
  // Prevent access to Node internals by not exposing `process` or `require`.
  return vm.createContext(sandbox, { name: 'quokka-js-clone' });
}

function runCode(context: vm.Context, code: string, timeoutMs: number) {
  if (!code || !code.trim()) return undefined;
  const script = new vm.Script(code, { filename: 'quokka-eval' });
  return script.runInContext(context, { timeout: timeoutMs });
}

/**
 * Evaluate a single expression or statement in the provided VM context.
 *
 * Strategy:
 * - Try to evaluate as an expression first by wrapping in parentheses.
 * - If that fails with a SyntaxError, fall back to running as a statement (useful for declarations).
 * - Return a serialised result or an error string.
 */
function evalExpression(context: vm.Context, expr: string, timeoutMs: number): EvalResult {
  try {
    if (!expr || !expr.trim()) return { result: 'undefined', isError: false };

    // First attempt: expression evaluation (works for most expressions)
    try {
      const wrapped = `( ${expr} )`;
      const script = new vm.Script(wrapped, { filename: 'quokka-expr' });
      const value = script.runInContext(context, { timeout: timeoutMs });
      return { result: formatValue(value), isError: false };
    } catch (ex: any) {
      // If it's a SyntaxError when parsing as expression, try as statement/declaration.
      if (ex && ex.name === 'SyntaxError') {
        // Run as statement (declaration or imperative code). Statements don't return a value.
        runCode(context, expr, timeoutMs);
        return { result: 'undefined', isError: false };
      }
      throw ex;
    }
  } catch (e: any) {
    return { result: formatError(e), isError: true };
  }
}

// Exported for unit testing
export { evalExpression, formatValue, formatError, replacerCircular, LIVE_MARKER_RE };

// Export status bar helpers for unit tests
export function getStatusBarItem() {
  return statusBarItem;
}

export function updateStatusBarFromItems(items?: ResultNode[]) {
  if (!statusBarItem) return;
  const list = items || [];
  let overall: ResultStatus = 'ok';
  if (list.some(it => it.status === 'error')) overall = 'error';
  else if (list.some(it => it.status === 'info')) overall = 'info';

  if (overall === 'ok') {
    statusBarItem.text = '$(check) Quokka-like';
    statusBarItem.color = '#52c41a';
    statusBarItem.tooltip = 'Quokka-like: All evaluations OK';
  } else if (overall === 'info') {
    statusBarItem.text = '$(alert) Quokka-like';
    statusBarItem.color = '#faad14';
    statusBarItem.tooltip = 'Quokka-like: Warnings or undefined values present';
  } else {
    statusBarItem.text = '$(error) Quokka-like';
    statusBarItem.color = '#ff4d4f';
    statusBarItem.tooltip = 'Quokka-like: Errors during evaluation';
  }
  statusBarItem.show();
}


function formatValue(v: any): string {
  try {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
    if (v && typeof v === 'object') {
      // Limit JSON size to avoid noise
      const json = JSON.stringify(v, replacerCircular(), 2);
      return json.length > 300 ? json.slice(0, 297) + '…' : json;
    }
    return String(v);
  } catch {
    return String(v);
  }
}

function formatError(e: any): string {
  const msg = (e && e.message) ? e.message : String(e);
  return `Error: ${msg}`;
}

function replacerCircular() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  };
}

/**
 * Safely read a value from the VM context. Some sandbox patterns may not expose
 * identifiers as direct properties; evaluate the identifier expression in the context
 * with a short timeout as a fallback.
 */
function readFromContext(ctx: vm.Context, name: string, timeoutMs: number) {
  try {
    // prefer direct property access
    if ((ctx as any).hasOwnProperty && (ctx as any).hasOwnProperty(name)) return (ctx as any)[name];
  } catch {}
  try {
    const script = new vm.Script(name, { filename: 'quokka-read' });
    return script.runInContext(ctx, { timeout: timeoutMs });
  } catch {
    return undefined;
  }
}

// -----------------------------
// Main evaluation pass
async function updateDecorations(editor: vscode.TextEditor) {
  const config = vscode.workspace.getConfiguration(CONFIG_NS);
  const autoEvaluate = config.get<boolean>('autoEvaluate', true);
  const maxEvaluations = config.get<number>('maxEvaluationsPerFile', 200);
  const timeoutPerRun = config.get<number>('timeoutPerRunMs', 600);
  const showErrors = config.get<boolean>('showErrors', true);

  if (!isEvaluationEnabled || !autoEvaluate) return;
  if (!editor || editor.document.languageId !== 'javascript') {
    // Only evaluate plain JavaScript for now (TypeScript is not executed).
  clearAllDecorations(editor);
  // hide status bar when not applicable
  if (statusBarItem) statusBarItem.hide();
    return;
  }

  const doc = editor.document;
  const lines = doc.getText().split(/\r?\n/);
  const outDecos: vscode.DecorationOptions[] = [];
  const errDecos: vscode.DecorationOptions[] = [];
  const gutterOkRanges: vscode.DecorationOptions[] = [];
  const gutterInfoRanges: vscode.DecorationOptions[] = [];
  const gutterErrorRanges: vscode.DecorationOptions[] = [];

  // Fresh context per pass so results match current file content consistently.
  const ctx = createSandbox();
  // show busy status while evaluating
  if (statusBarItem) {
    statusBarItem.text = '$(sync~spin) Quokka-like';
    statusBarItem.color = undefined;
    statusBarItem.tooltip = 'Quokka-like: Evaluating...';
    statusBarItem.show();
  }
  // clear previous results
  resultsProvider?.clear();

  // Build a single instrumented script for the whole file and run it once.
  const instrumentedLines: string[] = [];
  instrumentedLines.push('const __quokka_results = Object.create(null);');
  instrumentedLines.push('const __quokka_hits = Object.create(null);');

  // helper to extract declared names from a code line
  const extractDeclaredNamesFromCode = (code: string): string[] => {
    const names: string[] = [];
    try {
      const parsed = acorn.parse(code, { ecmaVersion: 'latest' }) as any;
      if (parsed && parsed.body && parsed.body.length > 0) {
        const node = parsed.body[0];
        const extractNames = (pat: any, out: string[]) => {
          if (!pat) return;
          switch (pat.type) {
            case 'Identifier': out.push(pat.name); break;
            case 'ObjectPattern':
              for (const prop of pat.properties || []) {
                if (prop.type === 'Property') extractNames(prop.value || prop.key, out);
                else if (prop.type === 'RestElement') extractNames(prop.argument, out);
              }
              break;
            case 'ArrayPattern':
              for (const elem of pat.elements || []) if (elem) extractNames(elem, out);
              break;
            case 'AssignmentPattern': extractNames(pat.left, out); break;
            case 'RestElement': extractNames(pat.argument, out); break;
            default: break;
          }
        };
        if (node.type === 'VariableDeclaration') {
          for (const decl of node.declarations) extractNames(decl.id, names);
        } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
          if (node.id && node.id.name) names.push(node.id.name);
        }
      }
    } catch {
      // ignore
    }
    return names;
  };

  // Construct instrumented source: include original lines; after each marked line, append capture code
  const markers: Array<{ line: number; code: string; kind: 'decl'|'expr'; declaredNames?: string[] }> = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const m = LIVE_MARKER_RE.exec(raw);
    const beforeMarker = m ? (m[1] || '') : raw;
    const trimmed = beforeMarker.replace(/;\s*$/, '');
  // Always append the original raw line (preserves behavior)
  instrumentedLines.push(raw);
  // increment per-line hit counter when the line executes
  instrumentedLines.push(`__quokka_hits[${i + 1}] = (__quokka_hits[${i + 1}]||0) + 1;`);
    if (!m) continue;
    // it's a marker line
    // determine if declaration or expression
    const isDecl = /^\s*(const|let|var|function|class)\b/.test(trimmed);
    if (isDecl) {
      const declared = extractDeclaredNamesFromCode(trimmed);
      markers.push({ line: i + 1, code: trimmed, kind: 'decl', declaredNames: declared });
      // append capture code to read declared names after the declaration executes
      const props = (declared.length === 0)
        ? `"__value": (typeof undefined === 'undefined' ? undefined : undefined)`
        : declared.map(n => `"${n}": (typeof ${n} === 'undefined' ? undefined : ${n})`).join(', ');
      instrumentedLines.push(`__quokka_results[${i + 1}] = { ${props} };`);
    } else {
      // expression: evaluate and store result or error
      markers.push({ line: i + 1, code: trimmed, kind: 'expr' });
      const exprCapture = `(() => { try { return (${trimmed}); } catch(e) { return { __quokka_err: String(e) }; } })()`;
      instrumentedLines.push(`__quokka_results[${i + 1}] = ${exprCapture};`);
    }
  }

  // Return the results map
  instrumentedLines.push('return { __quokka_results, __quokka_hits };');
  const wrapped = `(function(){\ntry{\n${instrumentedLines.join('\n')}\n}catch(e){ return { __quokka_error: String(e) }; }\n})();`;

  // Run the single instrumented script
  let runResult: any = undefined;
  try {
    const script = new vm.Script(wrapped, { filename: 'quokka-full' });
    runResult = script.runInContext(ctx, { timeout: timeoutPerRun });
  } catch (e) {
    // If the whole file fails, show the error and abort
    const deco: vscode.DecorationOptions = {
      range: new vscode.Range(0, 0, 0, 0),
      renderOptions: { after: { contentText: ` // ${formatError(e)}` } },
    };
    if (showErrors) errDecos.push(deco);
    resultsProvider?.pushResult({ line: 0, label: '<file>', value: formatError(e), status: 'error' });
  }

  const captures = (runResult && runResult.__quokka_results) ? runResult.__quokka_results : {};
  const hits = (runResult && runResult.__quokka_hits) ? runResult.__quokka_hits : {};

  // Map captures back to decorations
  for (const m of markers) {
    const val = captures[m.line];
    if (val && typeof val === 'object' && val.__quokka_err) {
      const deco: vscode.DecorationOptions = { range: new vscode.Range(m.line - 1, lines[m.line - 1].length, m.line - 1, lines[m.line - 1].length), renderOptions: { after: { contentText: ` // Error: ${val.__quokka_err}` } } };
      if (showErrors) errDecos.push(deco);
      resultsProvider?.pushResult({ line: m.line, label: m.code, value: `Error: ${val.__quokka_err}`, status: 'error' });
  // gutter
  gutterErrorRanges.push({ range: new vscode.Range(m.line - 1, 0, m.line - 1, 0) });
      continue;
    }
    if (m.kind === 'decl') {
      // declaredNames map or single __value
        if (val && typeof val === 'object') {
        const parts: string[] = [];
        for (const k of Object.keys(val)) {
          parts.push(`${k} = ${formatValue((val as any)[k])}`);
        }
        const text = parts.join(', ');
        const deco: vscode.DecorationOptions = { range: new vscode.Range(m.line - 1, lines[m.line - 1].length, m.line - 1, lines[m.line - 1].length), renderOptions: { after: { contentText: ` // ${text}` } } };
        if (text === 'undefined') {
          errDecos.push(deco);
          resultsProvider?.pushResult({ line: m.line, label: m.code, value: text, status: 'error' });
          gutterErrorRanges.push({ range: new vscode.Range(m.line - 1, 0, m.line - 1, 0) });
        } else {
          outDecos.push(deco);
          resultsProvider?.pushResult({ line: m.line, label: m.code, value: text, status: 'info' });
          gutterInfoRanges.push({ range: new vscode.Range(m.line - 1, 0, m.line - 1, 0) });
        }
      } else {
        const deco: vscode.DecorationOptions = { range: new vscode.Range(m.line - 1, lines[m.line - 1].length, m.line - 1, lines[m.line - 1].length), renderOptions: { after: { contentText: ` // undefined` } } };
        errDecos.push(deco);
        resultsProvider?.pushResult({ line: m.line, label: m.code, value: 'undefined', status: 'error' });
      }
    } else {
      // expression
      if (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, '__quokka_err')) {
        const deco: vscode.DecorationOptions = { range: new vscode.Range(m.line - 1, lines[m.line - 1].length, m.line - 1, lines[m.line - 1].length), renderOptions: { after: { contentText: ` // Error: ${val.__quokka_err}` } } };
        if (showErrors) errDecos.push(deco);
        resultsProvider?.pushResult({ line: m.line, label: m.code, value: `Error: ${val.__quokka_err}`, status: 'error' });
  gutterErrorRanges.push({ range: new vscode.Range(m.line - 1, 0, m.line - 1, 0) });
      } else {
        const text = formatValue(val);
        const deco: vscode.DecorationOptions = { range: new vscode.Range(m.line - 1, lines[m.line - 1].length, m.line - 1, lines[m.line - 1].length), renderOptions: { after: { contentText: ` // ${text}` } } };
        if (text === 'undefined') {
          errDecos.push(deco);
          resultsProvider?.pushResult({ line: m.line, label: m.code, value: text, status: 'error' });
          gutterErrorRanges.push({ range: new vscode.Range(m.line - 1, 0, m.line - 1, 0) });
        } else {
          outDecos.push(deco);
          resultsProvider?.pushResult({ line: m.line, label: m.code, value: text, status: 'ok' });
  gutterOkRanges.push({ range: new vscode.Range(m.line - 1, 0, m.line - 1, 0) });
        }
      }
    }
  }

  // Build coverage ranges from hits: merge consecutive executed lines into ranges
  try {
    const executedLines: number[] = Object.keys(hits).map(k => parseInt(k, 10)).filter(n => !isNaN(n) && hits[n] > 0).sort((a, b) => a - b);
    const coverageRanges: vscode.DecorationOptions[] = [];
    let start: number | null = null;
    let last = -1;
    for (const ln of executedLines) {
      if (start === null) { start = ln; last = ln; continue; }
      if (ln === last + 1) { last = ln; continue; }
      // flush range start..last
      coverageRanges.push({ range: new vscode.Range(start - 1, 0, last - 1, 0) });
      start = ln; last = ln;
    }
    if (start !== null) coverageRanges.push({ range: new vscode.Range(start - 1, 0, last - 1, 0) });
    // apply coverage decoration based on user config
    const coverageMode = vscode.workspace.getConfiguration(CONFIG_NS).get<string>('coverageDisplay', 'background');
    if (coverageMode === 'gutter' && coverageDecoration) {
      editor.setDecorations(coverageDecoration, coverageRanges);
      const coveredLines = new Set<number>();
      for (const r of coverageRanges) coveredLines.add((r.range as vscode.Range).start.line);
      const filterNotCovered = (arr: vscode.DecorationOptions[]) => arr.filter(d => !coveredLines.has((d.range as vscode.Range).start.line));
      if (gutterOkDecoration) editor.setDecorations(gutterOkDecoration, filterNotCovered(gutterOkRanges));
      if (gutterInfoDecoration) editor.setDecorations(gutterInfoDecoration, filterNotCovered(gutterInfoRanges));
      if (gutterErrorDecoration) editor.setDecorations(gutterErrorDecoration, filterNotCovered(gutterErrorRanges));
    } else {
      // default: background coverage highlight
      if (coverageBackgroundDecoration) editor.setDecorations(coverageBackgroundDecoration, coverageRanges);
      if (gutterOkDecoration) editor.setDecorations(gutterOkDecoration, gutterOkRanges);
      if (gutterInfoDecoration) editor.setDecorations(gutterInfoDecoration, gutterInfoRanges);
      if (gutterErrorDecoration) editor.setDecorations(gutterErrorDecoration, gutterErrorRanges);
    }
  } catch {}

  // Apply decorations
  if (outputDecorationType) editor.setDecorations(outputDecorationType, outDecos);
  if (errorDecorationType) editor.setDecorations(errorDecorationType, errDecos);
  if (gutterOkDecoration) editor.setDecorations(gutterOkDecoration, gutterOkRanges);
  if (gutterInfoDecoration) editor.setDecorations(gutterInfoDecoration, gutterInfoRanges);
  if (gutterErrorDecoration) editor.setDecorations(gutterErrorDecoration, gutterErrorRanges);
  // avoid duplicating before-dots when gutter icons exist on the same line
  const gutterLines = new Set<number>();
  for (const d of gutterOkRanges) { const r = (d.range as vscode.Range); gutterLines.add(r.start.line); }
  for (const d of gutterInfoRanges) { const r = (d.range as vscode.Range); gutterLines.add(r.start.line); }
  for (const d of gutterErrorRanges) { const r = (d.range as vscode.Range); gutterLines.add(r.start.line); }
  const filterRanges = (arr: vscode.DecorationOptions[]) => arr.filter(d => !gutterLines.has((d.range as vscode.Range).start.line));
  // (no inline-before decorations)

  // Refresh sidebar & output channel with latest results
  if (resultsProvider) {
    resultsProvider.refresh();
  }
  if (outputChannel && resultsProvider) {
    outputChannel.clear();
    const items = resultsProvider.getItems();
    items.forEach((r: ResultNode) => outputChannel!.appendLine(`[${r.line}] ${r.label} => ${r.value}`));
    outputChannel.show(true);
  }

  // Update status bar color based on results: error (red) > info (yellow) > ok (green)
  if (statusBarItem) {
    const items = resultsProvider ? resultsProvider.getItems() : [];
    let overall: ResultStatus = 'ok';
    if (items.some(it => it.status === 'error')) overall = 'error';
    else if (items.some(it => it.status === 'info')) overall = 'info';

    if (overall === 'ok') {
      statusBarItem.text = '$(check) Quokka-like';
      statusBarItem.color = '#52c41a';
      statusBarItem.tooltip = 'Quokka-like: All evaluations OK';
    } else if (overall === 'info') {
      statusBarItem.text = '$(alert) Quokka-like';
      statusBarItem.color = '#faad14';
      statusBarItem.tooltip = 'Quokka-like: Warnings or undefined values present';
    } else {
      statusBarItem.text = '$(error) Quokka-like';
      statusBarItem.color = '#ff4d4f';
      statusBarItem.tooltip = 'Quokka-like: Errors during evaluation';
    }
    statusBarItem.show();
  }
}

function clearAllDecorations(editor: vscode.TextEditor | undefined) {
  if (!editor) return;
  outputDecorationType && editor.setDecorations(outputDecorationType, []);
  errorDecorationType && editor.setDecorations(errorDecorationType, []);
}

// -----------------------------
// Debounce
function scheduleEvaluation(editor: vscode.TextEditor) {
  const config = vscode.workspace.getConfiguration(CONFIG_NS);
  const evaluationDelay = config.get<number>('evaluationDelay', 400);
  const key = editor.document.uri.toString();
  const prev = evaluationTimeouts.get(key);
  if (prev) clearTimeout(prev);
  const to = setTimeout(() => { evaluationTimeouts.delete(key); updateDecorations(editor); }, evaluationDelay);
  evaluationTimeouts.set(key, to);
}

// -----------------------------
// Extension lifecycle
export function activate(context: vscode.ExtensionContext) {
  console.log('quokka-js-clone: activated');

  createDecorationTypes();

  // setup results provider & output
  resultsProvider = new ResultsProvider();
  resultsView = vscode.window.createTreeView('quokkaResults', { treeDataProvider: resultsProvider });
  outputChannel = vscode.window.createOutputChannel('Quokka-like Results');
  // status bar indicator for evaluation status
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'quokkaJsClone.evaluateCurrentFile';
  statusBarItem.tooltip = 'Quokka-like: Click to evaluate current file';
  statusBarItem.hide();
  context.subscriptions.push(resultsView, outputChannel);
  context.subscriptions.push(statusBarItem);

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    scheduleEvaluation(activeEditor);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor ?? undefined;
      if (activeEditor) scheduleEvaluation(activeEditor);
      else isEvaluationEnabled = true; // keep enabled; nothing to render
    }),

    vscode.workspace.onDidChangeTextDocument(evt => {
      if (activeEditor && evt.document === activeEditor.document) scheduleEvaluation(activeEditor);
    }),

    vscode.workspace.onDidChangeConfiguration(evt => {
      if (evt.affectsConfiguration(CONFIG_NS)) {
        createDecorationTypes();
        if (activeEditor) scheduleEvaluation(activeEditor);
      }
    }),
  );

  // Register command handlers and expose both the camelCase and hyphenated IDs
  const evalHandler = () => {
    if (activeEditor) {
      updateDecorations(activeEditor);
      vscode.window.showInformationMessage('Quokka-like: Evaluated current file.');
    }
  };

  const toggleHandler = () => {
    isEvaluationEnabled = !isEvaluationEnabled;
    if (activeEditor) {
      if (isEvaluationEnabled) {
        updateDecorations(activeEditor);
        vscode.window.showInformationMessage('Quokka-like: Evaluation enabled.');
      } else {
        clearAllDecorations(activeEditor);
        vscode.window.showInformationMessage('Quokka-like: Evaluation disabled.');
      }
    }
  };

  const clearHandler = () => {
    if (activeEditor) {
      clearAllDecorations(activeEditor);
      vscode.window.showInformationMessage('Quokka-like: Results cleared.');
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('quokkaJsClone.evaluateCurrentFile', evalHandler),
    vscode.commands.registerCommand('quakka-js-clone.evaluateCurrentFile', evalHandler),
    vscode.commands.registerCommand('quokkaJsClone.toggleEvaluation', toggleHandler),
    vscode.commands.registerCommand('quakka-js-clone.toggleEvaluation', toggleHandler),
    vscode.commands.registerCommand('quokkaJsClone.clearResults', clearHandler),
    vscode.commands.registerCommand('quakka-js-clone.clearResults', clearHandler),
  );
}

export function deactivate() {
  // Clear any outstanding debounce timers for open documents
  for (const t of evaluationTimeouts.values()) {
    if (t) clearTimeout(t);
  }
  outputDecorationType?.dispose();
  errorDecorationType?.dispose();
  resultsView?.dispose();
  outputChannel?.dispose();
  statusBarItem?.dispose();
  coverageDecoration?.dispose();
  resultsProvider?.clear();
}