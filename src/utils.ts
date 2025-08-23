import * as vscode from 'vscode';

// Live marker regex - captures the code before the marker and matches both // ? and /*?*/ patterns
// Group 1 will contain the code text before the live marker.
// Match // ? or // ?<flags> and /*?*/ — allow optional non-space trailing flags after the '?'
export const LIVE_MARKER_RE = /(.*?)(?:\/\/\s*\?\S*|\/\*\s*\?\s*\*\/)/;

// Circular reference replacer for JSON.stringify
export function replacerCircular() {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

// Format values for display
export function formatValue(value: any, maxLength: number = 100): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const stringValue = `"${value}"`;
    return stringValue.length > maxLength
      ? `${stringValue.substring(0, maxLength)}..."`
      : stringValue;
  }
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'object') {
    try {
      const jsonValue = JSON.stringify(value, replacerCircular(), 2);
      return jsonValue.length > maxLength
        ? `${jsonValue.substring(0, maxLength)}...`
        : jsonValue;
    } catch {
      return '[Object]';
    }
  }

  const stringValue = String(value);
  return stringValue.length > maxLength
    ? `${stringValue.substring(0, maxLength)}...`
    : stringValue;
}

// Format errors for display
export function formatError(error: any): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}

// Clear all decorations from an editor
export function clearDecorations(editor: vscode.TextEditor): void {
  // This function is kept for backward compatibility
  // The actual clearing is now handled by DecorationManager
}
