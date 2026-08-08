# Live Eval Tutorials — Inline JavaScript & TypeScript Evaluation in VS Code

Hands-on tutorials for **Live Eval**, the VS Code extension that shows JavaScript and
TypeScript values inline as you type — no terminal, no run button, no `console.log`.

Every output shown in these tutorials was produced by running the snippet through
Live Eval's real evaluation pipeline, so what you read here is what you'll see in your
editor.

| # | Tutorial | You'll learn |
|---|----------|--------------|
| 1 | [Getting Started: See JavaScript Values Inline in VS Code](01-getting-started-inline-javascript-evaluation.md) | Install, add your first `// ?` marker, read inline results |
| 2 | [Debug JavaScript Without `console.log`](02-debug-javascript-without-console-log.md) | All 13 markers — `// ?`, `// ??`, `// watch`, `// assert`, `// err`, `// log`, `// count`, `// table`, `// hit` / `// tag`, `// perf` |
| 3 | [Visualize Recursion in JavaScript](03-visualize-recursion-in-javascript.md) | `// trace` and where to put it, the call-tree visualizer, memoization estimates, `// path` |
| 4 | [Understand the JavaScript Event Loop & Promises Visually](04-javascript-event-loop-and-promise-visualizer.md) | Call stack, Web APIs, microtask vs. macrotask queues, `async`/`await` |
| 5 | [Live TypeScript Evaluation in VS Code](05-live-typescript-evaluation.md) | Typed snippets, interfaces, generics, source-mapped results |
| 6 | [Multi-File Projects: Coverage and Imports](06-multi-file-projects-and-code-coverage.md) | Imports, which markers work across files, path aliases, entry points, ESM-only packages, gutter coverage, dead code |

## New here?

Start with tutorial 1 — it takes about two minutes. If you already have Live Eval
installed and just want the marker cheat sheet, jump to
[tutorial 2](02-debug-javascript-without-console-log.md).

## Related

- [Live Eval on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=liveevaljs-labs.liveevaljs)
- [Main README — full marker, command, and settings reference](../../README.md)
- [Configuration reference](../../README.md#configuration) — every `liveeval.*` setting, including
  `liveeval.features.*` for turning individual visualizer panels on and off
