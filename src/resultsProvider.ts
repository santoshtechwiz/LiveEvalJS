import * as vscode from 'vscode';
import { formatValue } from './utils';
import * as path from 'path';

export type ResultStatus = 'ok' | 'error' | 'info';

export interface ResultItem {
  line: number;
  label: string;
  value?: string;
  status: ResultStatus;
  console?: string[];
}

class FileTreeItem extends vscode.TreeItem {
  constructor(public readonly uri: string) {
    super(path.basename(uri), vscode.TreeItemCollapsibleState.Collapsed);
    this.resourceUri = vscode.Uri.parse(uri);
  }
}

class ResultTreeItem extends vscode.TreeItem {
  constructor(public readonly fileUri: string, public readonly item: ResultItem) {
    super(`${item.line}: ${item.label}`, vscode.TreeItemCollapsibleState.None);
    const consoleText = item.console && item.console.length ? `\nConsole:\n${item.console.join('\n')}` : '';
    this.description = item.value;
    this.tooltip = `${item.label} — ${item.value ?? ''}${consoleText}`;
    this.contextValue = item.status;
    this.iconPath = ResultTreeItem.makeIcon(item.status);
    this.command = {
      command: 'quokkaLite.openResult',
      title: 'Open Result',
      arguments: [this.fileUri, item.line]
    } as vscode.Command;
  }

  static makeIcon(status: ResultStatus) {
    const color = status === 'ok' ? '#52c41a' : status === 'error' ? '#ff4d4f' : '#faad14';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><circle cx='6' cy='6' r='5' fill='${color}' /></svg>`;
    return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  }
}

export class ResultsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private static instance: ResultsProvider;
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | null> = new vscode.EventEmitter<vscode.TreeItem | null>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | null> = this._onDidChangeTreeData.event;

  // Map file uri -> items
  private store = new Map<string, ResultItem[]>();

  private constructor() {}

  public static getInstance(): ResultsProvider {
    if (!ResultsProvider.instance) ResultsProvider.instance = new ResultsProvider();
    return ResultsProvider.instance;
  }

  public setResults(uri: string, items: ResultItem[]) {
    this.store.set(uri, items);
    this._onDidChangeTreeData.fire(null);
  }

  public clearResults(uri?: string) {
    if (uri) this.store.delete(uri);
    else this.store.clear();
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) {
      // Top-level: return file nodes
      const files: FileTreeItem[] = [];
      for (const uri of this.store.keys()) {
        files.push(new FileTreeItem(uri));
      }
      return files;
    }

    // If element is a file node, return the result items for that file
    if (element instanceof FileTreeItem) {
      const items = this.store.get(element.uri) || [];
      return items.map(it => new ResultTreeItem(element.uri, it));
    }

    return [];
  }
}

// Register view provider helper and an open command
export function registerResultsView(context: vscode.ExtensionContext) {
  const provider = ResultsProvider.getInstance();
  context.subscriptions.push(vscode.window.registerTreeDataProvider('quokkaLite.results', provider));

  const disposable = vscode.commands.registerCommand('quokkaLite.openResult', async (uri: string, line: number) => {
    try {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
      const editor = await vscode.window.showTextDocument(doc);
      const pos = new vscode.Position(Math.max(0, line - 1), 0);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      editor.selection = new vscode.Selection(pos, pos);
    } catch (e) {
      // ignore
    }
  });

  context.subscriptions.push(disposable);
}

export default ResultsProvider;
