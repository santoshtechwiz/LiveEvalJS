import { VM, VMScript } from 'vm2';
import { Runtime } from './types';

export class NodeRuntime implements Runtime {
  public name = 'node';
  private vm?: VM;
  private context: Record<string, any> = {};

  constructor() {
    this.reset();
  }

  private reset() {
    this.vm = new VM({ sandbox: this.context, timeout: 1000 });
  }

  async executeCode(code: string, timeout: number): Promise<any> {
    if (!this.vm) this.reset();
    try {
      const script = new VMScript(code);
      // vm2 enforces timeout at construction; we ignore the passed timeout for now
      const result = this.vm!.run(script);
      return result;
    } catch (err) {
      throw err;
    }
  }

  clearContext(): void {
    this.context = {};
    this.reset();
  }

  getContext(): any {
    return this.context;
  }

  setVariable(name: string, value: any): void {
    this.context[name] = value;
  }

  getVariable(name: string): any {
    return this.context[name];
  }
}

export class BrowserRuntime implements Runtime {
  public name = 'browser';
  // Browser runtime is a stub in Node VS Code extension environment
  async executeCode(_code: string, _timeout: number): Promise<any> {
    throw new Error('Browser runtime not supported in this environment');
  }

  clearContext(): void {}
  getContext(): any { return {}; }
  setVariable(_name: string, _value: any): void {}
  getVariable(_name: string): any { return undefined; }
}

// Simple RuntimeManager
export class RuntimeManager {
  private static instance: RuntimeManager;
  private runtime: Runtime;

  private constructor() {
    this.runtime = new NodeRuntime();
  }

  public static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) RuntimeManager.instance = new RuntimeManager();
    return RuntimeManager.instance;
  }

  public setRuntime(name: string) {
    if (name === 'browser') this.runtime = new BrowserRuntime();
    else this.runtime = new NodeRuntime();
  }

  public getRuntime(): Runtime {
    return this.runtime;
  }

  public async execute(code: string, timeout = 1000) {
    return this.runtime.executeCode(code, timeout);
  }

  public clearContext() {
    this.runtime.clearContext();
  }
}

export default RuntimeManager.getInstance();
