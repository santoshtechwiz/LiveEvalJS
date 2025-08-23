// Mock VS Code API for testing
export const window = {
  createTextEditorDecorationType: jest.fn(() => ({
    dispose: jest.fn()
  })),
  createStatusBarItem: jest.fn(() => ({
    text: '',
    color: '',
    tooltip: '',
    command: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn()
  })),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showTextDocument: jest.fn(),
  activeTextEditor: undefined,
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn()
  }))
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn()
  })),
  onDidChangeConfiguration: jest.fn(() => ({
    dispose: jest.fn()
  })),
  onDidChangeTextDocument: jest.fn(() => ({
    dispose: jest.fn()
  })),
  openTextDocument: jest.fn()
};

export const commands = {
  registerCommand: jest.fn(() => ({
    dispose: jest.fn()
  })),
  executeCommand: jest.fn()
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2
};

export const Range = jest.fn();

export const Position = jest.fn();

export const Selection = jest.fn();

export const DecorationRangeBehavior = {
  OpenOpen: 0,
  ClosedClosed: 1,
  OpenClosed: 2,
  ClosedOpen: 3
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

export const TextEditorRevealType = {
  Default: 0,
  InCenter: 1,
  InCenterIfOutsideViewport: 2,
  AtTop: 3
};

export const Uri = {
  parse: jest.fn(),
  file: jest.fn()
};
