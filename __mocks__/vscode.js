// Minimal mock of the VS Code API for unit tests.
// Only implements the small surface used by the unit-tested module.
module.exports = {
  workspace: {
    getConfiguration: () => ({ get: (_k, d) => d }),
    onDidChangeTextDocument: () => ({ dispose: () => {} }),
    onDidChangeConfiguration: () => ({ dispose: () => {} }),
  },
  window: {
    createTextEditorDecorationType: () => ({ dispose: () => {} }),
    createTreeView: () => ({ dispose: () => {} }),
    createOutputChannel: () => ({ clear: () => {}, appendLine: () => {}, show: () => {}, dispose: () => {} }),
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
    showInformationMessage: () => {},
    createStatusBarItem: (alignment, priority) => {
      const item = {
        text: '',
        color: undefined,
        tooltip: undefined,
        _shown: false,
        command: undefined,
        show: function() { this._shown = true; },
        hide: function() { this._shown = false; },
        dispose: function() { this._disposed = true; }
      };
      return item;
    },
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
  },
  Uri: {
    parse: (s) => s,
  },
  DecorationRangeBehavior: { ClosedOpen: 0 },
  Range: class Range { constructor(s,e,s2,e2) { /* noop */ } },
  TreeItem: class TreeItem { constructor(label) { this.label = label } },
};
