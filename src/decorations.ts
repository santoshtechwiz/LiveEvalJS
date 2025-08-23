import * as vscode from 'vscode';
import { ThemeConfig } from './types';
import { ConfigurationManager } from './core/ConfigurationManager';

export class DecorationManager {
  private static instance: DecorationManager;
  private configManager: ConfigurationManager;

  // Decoration types
  private outputDecorationType?: vscode.TextEditorDecorationType;
  private errorDecorationType?: vscode.TextEditorDecorationType;
  private consoleDecorationType?: vscode.TextEditorDecorationType;
  private gutterOkDecoration?: vscode.TextEditorDecorationType;
  private gutterErrorDecoration?: vscode.TextEditorDecorationType;
  private gutterInfoDecoration?: vscode.TextEditorDecorationType;
  private gutterConsoleDecoration?: vscode.TextEditorDecorationType;
  private coverageBackgroundDecoration?: vscode.TextEditorDecorationType;
  private coverageGutterDecoration?: vscode.TextEditorDecorationType;

  private constructor() {
    this.configManager = ConfigurationManager.getInstance();
    this.createDecorationTypes();

    // Recreate decorations when config changes
    this.configManager.onConfigurationChanged(() => {
      this.createDecorationTypes();
    });
  }

  public static getInstance(): DecorationManager {
    if (!DecorationManager.instance) {
      DecorationManager.instance = new DecorationManager();
    }
    return DecorationManager.instance;
  }

  private createDecorationTypes(): void {
    // Dispose existing decorations
    this.disposeDecorations();

    const themeConfig = this.configManager.getThemeConfig();
    const legacyConfig = this.configManager.getLegacyConfig();

    // Support both new and legacy configuration
    const resultColor = themeConfig.resultColor || legacyConfig.resultColor;
    const errorColor = themeConfig.errorColor || legacyConfig.errorColor;
    const successColor = themeConfig.successColor;
    const consoleColor = themeConfig.consoleColor;

    // Create inline result decorations
    this.outputDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 2.5em',
        textDecoration: 'none',
        color: resultColor,
        fontStyle: 'italic',
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    });

    this.errorDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 2.5em',
        textDecoration: 'none',
        color: errorColor,
        fontStyle: 'italic',
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    });

    this.consoleDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 2.5em',
        textDecoration: 'none',
        color: consoleColor,
        fontStyle: 'italic',
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    });

    // Create gutter decorations
    const makeDotUri = (color: string) => vscode.Uri.parse(
      `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><circle cx='4' cy='4' r='3' fill='${color}' /></svg>`
      )}`
    );

    this.gutterOkDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: makeDotUri(successColor),
      gutterIconSize: '8px',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    this.gutterErrorDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: makeDotUri(errorColor),
      gutterIconSize: '8px',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    this.gutterInfoDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: makeDotUri('#faad14'),
      gutterIconSize: '8px',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    this.gutterConsoleDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: makeDotUri(consoleColor),
      gutterIconSize: '8px',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    // Create coverage decorations
    this.coverageBackgroundDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: themeConfig.coverageHighlight,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });

    const makeBlockUri = (color: string) => vscode.Uri.parse(
      `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='4' height='14' viewBox='0 0 4 14'><rect x='0' y='1' width='4' height='12' fill='${color}' rx='1' /></svg>`
      )}`
    );

    this.coverageGutterDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: makeBlockUri(successColor),
      gutterIconSize: 'auto',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    });
  }

  public setDecorations(
    editor: vscode.TextEditor,
    decorationType: 'result' | 'error' | 'console' | 'gutterOk' | 'gutterError' | 'gutterInfo' | 'gutterConsole' | 'coverageBackground' | 'coverageGutter',
    decorations: vscode.DecorationOptions[]
  ): void {
    const decorationTypeMap = {
      result: this.outputDecorationType,
      error: this.errorDecorationType,
      console: this.consoleDecorationType,
      gutterOk: this.gutterOkDecoration,
      gutterError: this.gutterErrorDecoration,
      gutterInfo: this.gutterInfoDecoration,
      gutterConsole: this.gutterConsoleDecoration,
      coverageBackground: this.coverageBackgroundDecoration,
      coverageGutter: this.coverageGutterDecoration
    };

    const decoration = decorationTypeMap[decorationType];
    if (decoration) {
      editor.setDecorations(decoration, decorations);
    }
  }

  public clearAllDecorations(editor: vscode.TextEditor): void {
    if (this.outputDecorationType) editor.setDecorations(this.outputDecorationType, []);
    if (this.errorDecorationType) editor.setDecorations(this.errorDecorationType, []);
    if (this.consoleDecorationType) editor.setDecorations(this.consoleDecorationType, []);
    if (this.gutterOkDecoration) editor.setDecorations(this.gutterOkDecoration, []);
    if (this.gutterErrorDecoration) editor.setDecorations(this.gutterErrorDecoration, []);
    if (this.gutterInfoDecoration) editor.setDecorations(this.gutterInfoDecoration, []);
    if (this.gutterConsoleDecoration) editor.setDecorations(this.gutterConsoleDecoration, []);
    if (this.coverageBackgroundDecoration) editor.setDecorations(this.coverageBackgroundDecoration, []);
    if (this.coverageGutterDecoration) editor.setDecorations(this.coverageGutterDecoration, []);
  }

  private disposeDecorations(): void {
    this.outputDecorationType?.dispose();
    this.errorDecorationType?.dispose();
    this.consoleDecorationType?.dispose();
    this.gutterOkDecoration?.dispose();
    this.gutterErrorDecoration?.dispose();
    this.gutterInfoDecoration?.dispose();
    this.gutterConsoleDecoration?.dispose();
    this.coverageBackgroundDecoration?.dispose();
    this.coverageGutterDecoration?.dispose();
  }

  public dispose(): void {
    this.disposeDecorations();
  }
}
