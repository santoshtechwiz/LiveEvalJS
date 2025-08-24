// Minimal vscode mock for tests
export const window = {
  createStatusBarItem: () => ({ show: () => {}, hide: () => {}, dispose: () => {}, text: '', color: '', tooltip: '' }),
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
  // Minimal output channel used by Logger in tests
  createOutputChannel: (name?: string) => ({
    appendLine: (_: string) => {},
    show: () => {},
    dispose: () => {}
  }),
  registerTreeDataProvider: () => ({ dispose: () => {} }),
  showTextDocument: async (doc: any) => ({
    selection: undefined,
    revealRange: () => {},
    // minimal editor stub
  }),
};
export const workspace = {
  getConfiguration: () => ({ get: (_k: string, d: any) => d, update: () => Promise.resolve() }),
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: () => {} })),
  openTextDocument: jest.fn(async (uri: any) => ({ uri, getText: () => '', fileName: uri && uri.toString ? uri.toString() : String(uri), lineCount: 0, lineAt: (_: number) => ({ text: '' }) }))
};
export const commands = {
  registerCommand: jest.fn(() => ({ dispose: () => {} })),
  executeCommand: jest.fn()
};
export const StatusBarAlignment = { Right: 1 };
export const EndOfLine = { LF: 1 };
export const Uri = { parse: (s: string) => ({ toString: () => s }) };
export const Range = class { constructor(public start?: any, public end?: any) {} };
export const Position = class { constructor(public line = 0, public character = 0) {} };
export const Selection = class { constructor(public a: any, public b: any) {} };
export const ViewColumn = { One: 1 };

// Tree/Explorer helpers
export class TreeItem {
  label: string | undefined;
  collapsibleState: any;
  resourceUri?: any;
  description?: string;
  tooltip?: string;
  contextValue?: string;
  command?: any;
  iconPath?: any;
  constructor(label?: any, collapsibleState?: any) { this.label = label; this.collapsibleState = collapsibleState; }
}
export const TreeItemCollapsibleState = { Collapsed: 1, None: 0 };
export const TextEditorRevealType = { InCenter: 1 };

const _default = {
  window,
  workspace,
  commands,
  StatusBarAlignment,
  EndOfLine,
  Uri,
  Range,
  Position,
  Selection,
  ViewColumn,
  TreeItem,
  TreeItemCollapsibleState,
  TextEditorRevealType
};

export default _default;

// For CommonJS consumers (some tests import vscode with require), expose module.exports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = _default;
