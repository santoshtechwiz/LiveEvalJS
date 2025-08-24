import * as vscode from 'vscode';

// Centralized regex patterns
export const LIVE_MARKER_RE = /(.*?)(?:\/\/\s*\?\S*|\/\*\s*\?\s*\*\/)/;

// Shared formatting functions
export function formatValue(value: any, maxLength: number = 100): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    const truncated = value.length > maxLength 
      ? `${value.substring(0, maxLength)}...`
      : value;
    return `"${truncated}"`;
  }

  if (typeof value === 'object') {
    try {
      let json = JSON.stringify(value);
      if (json.length > maxLength) {
        json = `${json.substring(0, maxLength)}...`;
      }
      return json;
    } catch {
      return '[Object]';
    }
  }

  const str = String(value);
  return str.length > maxLength 
    ? `${str.substring(0, maxLength)}...`
    : str;
}

export function formatError(error: any): string {
  return error.message || 'Unknown error';
}

// Clear all decorations from an editor
export function clearDecorations(editor: vscode.TextEditor): void {
  // This function is kept for backward compatibility
  // The actual clearing is now handled by DecorationManager
}
