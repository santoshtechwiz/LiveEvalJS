import * as vscode from 'vscode';
import { ExecutionResult } from './ExecutionEngine';
import { formatValue, formatError } from '../utils';
import { DecorationManager } from '../decorations';

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
  const gutterOk: vscode.DecorationOptions[] = [];
  const gutterError: vscode.DecorationOptions[] = [];
  const coverageBg: vscode.DecorationOptions[] = [];
  const coverageGutter: vscode.DecorationOptions[] = [];

    annotations.forEach(annotation => {
      const line = editor.document.lineAt(annotation.line);
      const range = new vscode.Range(line.range.end, line.range.end);

      if (annotation.result.isError) {
        // Error annotation
    const errorText = formatError(annotation.result.error!);
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
  gutterError.push({ range });
      } else {
        // Success annotation
    const valueText = formatValue(annotation.result.value, this.options.maxValueLength);
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
        gutterOk.push({ range });

        // coverage decorations when result.covered is true
        if (annotation.result.covered) {
          coverageBg.push({ range });
          coverageGutter.push({ range });
        }

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
                margin: '0 0 0 1em'
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

  // Apply gutter and coverage decorations via DecorationManager
  const decMgr = DecorationManager.getInstance();
  if (gutterOk.length) decMgr.setDecorations(editor, 'gutterOk', gutterOk);
  if (gutterError.length) decMgr.setDecorations(editor, 'gutterError', gutterError);
  if (coverageBg.length) decMgr.setDecorations(editor, 'coverageBackground', coverageBg);
  if (coverageGutter.length) decMgr.setDecorations(editor, 'coverageGutter', coverageGutter);
  }


  // Formatting delegated to shared utils.formatValue/formatError

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
