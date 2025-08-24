// Minimal vscode mock for tests
export const window = {
  createStatusBarItem: () => ({ show: () => {}, hide: () => {}, dispose: () => {}, text: '', color: '', tooltip: '' }),
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
};
export const workspace = {
  getConfiguration: () => ({ update: () => Promise.resolve() }),
  onDidChangeTextDocument: () => ({ dispose: () => {} })
};
export const commands = {
  registerCommand: () => ({ dispose: () => {} })
};
export const StatusBarAlignment = { Right: 1 };
export const EndOfLine = { LF: 1 };
export const Uri = { parse: (s: string) => ({ toString: () => s }) };
export const Range = class {};
export const Position = class { constructor(public line = 0, public character = 0) {} };
export const Selection = class { constructor(public a: any, public b: any) {} };
export const ViewColumn = { One: 1 };
export default {};
