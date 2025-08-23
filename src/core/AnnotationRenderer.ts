import * as vscode from 'vscode';
import { ExecutionResult } from './ExecutionEngine';

export interface AnnotationOptions {
  showTypes: boolean;
  showExecutionTime: boolean;
  maxValueLength: number;
  showConsoleOutput: boolean;
}

export interface LineAnnotation {
  line: number;
  result: ExecutionResult;
  decoration?: vscode.TextEditorDecorationType;
}

export class AnnotationRenderer {
  private decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
  private activeAnnotations = new Map<string, LineAnnotation[]>();

  constructor(private options: AnnotationOptions) {
    this.createDecorationTypes();
  }

  /**
   * Renders annotations for execution results
   */
  renderAnnotations(
    editor: vscode.TextEditor,
    results: Map<number, ExecutionResult>
  ): void {
    const documentUri = editor.document.uri.toString();
    
    // Clear existing annotations
    this.clearAnnotations(editor);

    const annotations: LineAnnotation[] = [];
    
    results.forEach((result, lineNumber) => {
      const annotation = this.createAnnotation(lineNumber, result, editor);
      if (annotation) {
        annotations.push(annotation);
      }
    });

    // Apply annotations
    this.applyAnnotations(editor, annotations);
    this.activeAnnotations.set(documentUri, annotations);
  }

  /**
   * Clears all annotations from an editor
   */
  clearAnnotations(editor: vscode.TextEditor): void {
    const documentUri = editor.document.uri.toString();
    const annotations = this.activeAnnotations.get(documentUri) || [];
    
    // Clear decorations
    this.decorationTypes.forEach(decorationType => {
      editor.setDecorations(decorationType, []);
    });

    this.activeAnnotations.delete(documentUri);
  }

  /**
   * Updates annotation options
   */
  updateOptions(options: Partial<AnnotationOptions>): void {
    this.options = { ...this.options, ...options };
    this.createDecorationTypes(); // Recreate with new options
  }

  /**
   * Disposes of all decoration types
   */
  dispose(): void {
    this.decorationTypes.forEach(decorationType => {
      decorationType.dispose();
    });
    this.decorationTypes.clear();
    this.activeAnnotations.clear();
  }

  private createAnnotation(
    lineNumber: number,
    result: ExecutionResult,
    editor: vscode.TextEditor
  ): LineAnnotation | null {
    try {
      const line = editor.document.lineAt(lineNumber);
      const range = new vscode.Range(line.range.end, line.range.end);

      const annotation: LineAnnotation = {
        line: lineNumber,
        result
      };

      return annotation;
    } catch (error) {
      // Line might not exist
      return null;
    }
  }

  private applyAnnotations(editor: vscode.TextEditor, annotations: LineAnnotation[]): void {
    const resultDecorations: vscode.DecorationOptions[] = [];
    const errorDecorations: vscode.DecorationOptions[] = [];
    const consoleDecorations: vscode.DecorationOptions[] = [];

    annotations.forEach(annotation => {
      const line = editor.document.lineAt(annotation.line);
      const range = new vscode.Range(line.range.end, line.range.end);

      if (annotation.result.isError) {
        // Error annotation
        const errorText = this.formatError(annotation.result.error!);
        errorDecorations.push({
          range,
          renderOptions: {
            after: {
              contentText: ` ❌ ${errorText}`,
              color: '#ff6b6b',
              fontStyle: 'italic',
              margin: '0 0 0 1em'
            }
          }
        });
      } else {
        // Success annotation
        const valueText = this.formatValue(annotation.result.value);
        const typeText = this.options.showTypes ? ` : ${annotation.result.type}` : '';
        const timeText = this.options.showExecutionTime ? ` (${annotation.result.executionTime}ms)` : '';
        
        resultDecorations.push({
          range,
          renderOptions: {
            after: {
              contentText: ` ⇒ ${valueText}${typeText}${timeText}`,
              color: '#51cf66',
              fontStyle: 'italic',
              margin: '0 0 0 1em'
            }
          }
        });

        // Console output annotation
        if (this.options.showConsoleOutput && annotation.result.consoleOutput.length > 0) {
          const consoleText = annotation.result.consoleOutput.join(' | ');
          consoleDecorations.push({
            range,
            renderOptions: {
              after: {
                contentText: ` 📝 ${consoleText}`,
                color: '#74c0fc',
                fontStyle: 'italic',
                margin: '0 0 0 1em',
                opacity: '0.8'
              }
            }
          });
        }
      }
    });

    // Apply decorations
    if (resultDecorations.length > 0) {
      editor.setDecorations(this.decorationTypes.get('result')!, resultDecorations);
    }
    if (errorDecorations.length > 0) {
      editor.setDecorations(this.decorationTypes.get('error')!, errorDecorations);
    }
    if (consoleDecorations.length > 0) {
      editor.setDecorations(this.decorationTypes.get('console')!, consoleDecorations);
    }
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'string') {
      const truncated = value.length > this.options.maxValueLength 
        ? `${value.substring(0, this.options.maxValueLength)}...`
        : value;
      return `"${truncated}"`;
    }
    
    if (typeof value === 'object') {
      try {
        let json = JSON.stringify(value);
        if (json.length > this.options.maxValueLength) {
          json = `${json.substring(0, this.options.maxValueLength)}...`;
        }
        return json;
      } catch {
        return '[Object]';
      }
    }
    
    const str = String(value);
    return str.length > this.options.maxValueLength 
      ? `${str.substring(0, this.options.maxValueLength)}...`
      : str;
  }

  private formatError(error: Error): string {
    return error.message || 'Unknown error';
  }

  private createDecorationTypes(): void {
    // Dispose existing types
    this.decorationTypes.forEach(type => type.dispose());
    this.decorationTypes.clear();

    // Result decoration
    this.decorationTypes.set('result', vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    }));

    // Error decoration
    this.decorationTypes.set('error', vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    }));

    // Console decoration
    this.decorationTypes.set('console', vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
    }));
  }
}
