import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Quokka.js');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    let logMessage = `[${timestamp}] ${levelName}: ${message}`;

    if (data) {
      if (data instanceof Error) {
        logMessage += `\n  Error: ${data.message}`;
        if (data.stack) {
          logMessage += `\n  Stack: ${data.stack}`;
        }
      } else if (typeof data === 'object') {
        try {
          logMessage += `\n  Data: ${JSON.stringify(data, null, 2)}`;
        } catch {
          logMessage += `\n  Data: ${String(data)}`;
        }
      } else {
        logMessage += `\n  Data: ${String(data)}`;
      }
    }

    this.outputChannel.appendLine(logMessage);
    
    // Also log to console in development
    if (level >= LogLevel.WARN) {
      console.log(logMessage);
    }
  }
}
