# Live Eval — Inline JavaScript & TypeScript Playground

[![Version](https://img.shields.io/visual-studio-marketplace/v/liveevaljs-labs.liveevaljs?label=version&color=blue)](https://marketplace.visualstudio.com/items?itemName=liveevaljs-labs.liveevaljs)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-blue)](https://marketplace.visualstudio.com/items?itemName=liveevaljs-labs.liveevaljs)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Buy me a coffee](https://img.shields.io/badge/buy%20me%20a%20coffee-support-yellow?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/shipwithsantosh)

**Run JavaScript and TypeScript instantly in VS Code — see the result of every line inline as you type.**

> Even minor versions (`3.2.x`, `3.4.x`) are stable. Odd minor versions (`3.3.x`) are pre-releases —
> install them with *Switch to Pre-Release Version* in VS Code.

Live Eval evaluates your code as you write it and shows the result of any expression right next to it — no terminal, no run button, no REPL, no `console.log`, no context switching. It's a free playground and scratchpad for debugging and inspecting JS/TS, with built-in **recursion** and **Event Loop & Promise** visualizers you won't find elsewhere.

![Adding a // ? marker to a line of JavaScript in VS Code and the value appearing inline, then updating when the code changes](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/hero-marker.gif?raw=1)

## Why Live Eval?

- **See values inline** with `// ?` — and inspect objects, prototype chains and tables without leaving the editor
- **Visualize recursion** as an interactive call tree, DAG, and timeline
- **Visualize the Event Loop & Promises** step-by-step in a built-in panel
- **See coverage in the gutter** — execution counts and dead-code highlighting on every run
- Works across `.js`, `.ts`, top-level `await`, and multi-file projects (relative imports + tsconfig path aliases)

## Quick Example

```javascript
const prices = [12.5, 8.0, 24.99, 5.5];
prices.filter(p => p > 10);        // ? → [12.5, 24.99]  ▁█
prices.reduce((a, b) => a + b, 0); // ? → 50.989999999999995
```

Every value in this README came from running the snippet through Live Eval — including that
floating-point tail, which is the sort of thing inline evaluation shows you before a customer does.

## Get Started in 30 Seconds

1. Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=liveevaljs-labs.liveevaljs)
2. Open a `.js` or `.ts` file
3. Add `// ?` to any line — results appear as you type

> **Tip:** Run **LiveEval: New JavaScript Scratchpad** or **LiveEval: New TypeScript Scratchpad** from the Command Palette for a file pre-loaded with examples.

---

## Marker Reference

Markers are plain comments. They don't change how your code runs — they just tell Live Eval what to show.

| Marker | What it does | In imported files |
|--------|-------------|:---:|
| `// ?` | Show the value of the expression on this line | ✅ |
| `// ??` | Deep inspection — type, keys, prototype chain | — |
| `// trace` | Record every call to this function (args, return, timing) | ✅ |
| `// watch` | Track a variable's value across every iteration and re-evaluation | — |
| `// assert` | Inline pass/fail test | — |
| `// path` | Which branches ran, which were missed, and how often | — |
| `// perf` | Benchmark this expression (ops/sec, avg time) | — |
| `// err` | Run the line in try/catch — show the caught error, or a green `✓ no throw` | — |
| `// log` | Show only `console.log` output inline, not the return value | — |
| `// count` | Show how many times the line executed in one evaluation pass | — |
| `// table` | Render the value as a formatted table in the hover card | — |
| `// hit` | Count how often a line was reached, and mark it on the trace timeline | — |
| `// tag` | The same as `// hit`, under a name that reads better on a branch | — |

**Only `// ?` and `// trace` work inside imported files.** Put any other marker in a file you
reached through an `import` and it is inert — the file still evaluates, the marker just reports
nothing. Markers in the file you have open all work normally.

`// watch` takes an optional sampling interval: `// watch 3` records every third value, which
keeps a long loop readable. `// watch 1` is the same as `// watch`.

Full walkthrough with worked examples: [Debug JavaScript without `console.log`](docs/tutorials/02-debug-javascript-without-console-log.md).

---

## What You Can Do

### Visualize recursion

Add `// trace` to a recursive function, then open **LiveEval: Visualize Recursion Tree**:

```javascript
function fib(n) {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
} // trace
fib(8);
// → ⟳ fib  ×67  ↓8  6ms
```

Step through every call, argument, return value, depth and timing as a **call tree**, a **DAG**
(collapsed duplicate subtrees), a **timeline**, or a **minimap** — with a memoization estimate
showing how many of those 67 calls were redundant. Put the marker on the function's opening line,
its closing brace, an arrow function's assignment, or a whole `class`. **An individual method
inside a class body is the one placement that doesn't work** — trace the class instead.

→ [Visualize Recursion in JavaScript](docs/tutorials/03-visualize-recursion-in-javascript.md)

### Visualize the Event Loop & Promises

Open **LiveEval: Visualize Promises** with a file containing `async`/`await`, Promises or timers.
The panel animates the **call stack**, **Web APIs**, **microtask queue** and **callback queue**,
plus the create → pending → fulfilled/rejected state of every promise, including `Promise.all`,
`race`, `allSettled` and `any`. Step through it, or play it back at adjustable speed. The
**Timeline** view shows the whole run as a phase-grouped story with real millisecond offsets — so
a synchronous log at +2 ms and an awaited result at +2005 ms sit side by side.

→ [Understand the JavaScript Event Loop & Promises](docs/tutorials/04-javascript-event-loop-and-promise-visualizer.md)

### See coverage and branch paths

Every evaluation records which lines ran and how often. Executed lines get a gutter badge; lines
that never ran are highlighted, so dead code is visible without a coverage tool. `// path` adds
the branch-level view:

```javascript
function classify(n) {
  if (n > 0) return "pos";
  else if (n < 0) return "neg";
  else return "zero";
} // path
classify(5); classify(-3);
// → [PATH] ⬡ 2/3 paths · missed: else (line 4) (2 calls)
```

Every branch the function *contains* is counted, so the one you never exercised is named rather
than silently absent. Tune the gutter with `liveeval.coverage.style` (`full`, `quiet`, `dead-only`),
and toggle the `✓`/`✗` branch badges with `liveeval.features.branchHighlight.enabled`.

→ [Multi-File Projects: Coverage and Imports](docs/tutorials/06-multi-file-projects-and-code-coverage.md)

### Work across multiple files, in TypeScript

Import your own `.ts`, `.js`, `.cjs`, `.mjs` and `.json` files and get inline results across the
whole import graph. Relative imports and `tsconfig.json` path aliases (`@lib/*`) resolve
automatically — extend them with `liveeval.pathAliases`. Editing a leaf module with nothing to run?
Live Eval finds the entry point and re-runs it, so your results stay live; pin it with
`liveeval.execution.entryPoints`, and keep large graphs responsive with
`liveeval.execution.entryReevalBudgetMs`.

TypeScript needs no setup: types are stripped at evaluation time and results are mapped back
through source maps, so annotations land on the line you wrote even when the compiler deleted the
lines above it.

→ [Live TypeScript Evaluation](docs/tutorials/05-live-typescript-evaluation.md)

### Inspect, assert and benchmark in place

```javascript
for (let i = 1; i <= 5; i++) {
  i * i;                     // ? → 1  4  9  16  25  ▁▂▃▅█
}

const sum = add(2, 3);
sum === 5;                   // assert → ✓ OK
sum === 6;                   // assert → ✗ false

JSON.parse('{ not json }');  // err → ⊘ SyntaxError: Expected property name or '}' in JSON at position 2
sumSqrt();                   // perf → [PERF] 10,960 ops/s · avg 91.24μs · 1,096 runs

const res = await fetch('https://jsonplaceholder.typicode.com/todos/1'); // ?
```

Top-level `await` needs no wrapper, `console.log` lines are annotated automatically, and
`liveeval.behavior.stickyResults` keeps the last good results on screen while you type through a
syntax error. Every panel can be switched off independently via the `liveeval.features.*` settings.

---

## See it end to end

![Live Eval showing inline JavaScript values in VS Code — // ? results, assertions, watch history, and loop sparklines rendered next to the code](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/demo.gif?raw=1)

---

## Tutorials

Step-by-step guides with screenshots — every output in them was produced by running the
snippet through Live Eval's real evaluation pipeline.

| # | Tutorial | You'll learn |
|---|----------|--------------|
| 1 | [Getting Started: See JavaScript Values Inline in VS Code](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/01-getting-started-inline-javascript-evaluation.md) | Install, add your first `// ?`, read inline results |
| 2 | [Debug JavaScript Without `console.log`](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/02-debug-javascript-without-console-log.md) | All 13 markers, with worked examples |
| 3 | [Visualize Recursion in JavaScript](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/03-visualize-recursion-in-javascript.md) | `// trace`, where to put it, the call-tree visualizer |
| 4 | [Understand the JavaScript Event Loop & Promises Visually](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/04-javascript-event-loop-and-promise-visualizer.md) | Call stack, Web APIs, microtasks vs. macrotasks |
| 5 | [Live TypeScript Evaluation in VS Code](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/05-live-typescript-evaluation.md) | Typed snippets, generics, source-mapped results |
| 6 | [Multi-File Projects: Coverage and Imports](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/06-multi-file-projects-and-code-coverage.md) | Imports, path aliases, entry points, dead-code detection |

Browse them all in the [tutorial index](https://github.com/santoshtechwiz/LiveEvalJS/blob/main/docs/tutorials/README.md).

---

## Sandbox & Security

Live Eval runs your code in an **isolated sandbox** — a dedicated Node.js `vm` context per document with its own global scope, no access to the extension host's globals, and hard limits on time and recursion depth. Nothing you evaluate can affect VS Code itself.

**What works out of the box:**
- Safe Node.js built-ins: `path`, `crypto`, `util`, `url`, `querystring`, `events`, `buffer`, `stream`, `os` — with or without the `node:` prefix (`require('node:path')` works too)
- Both CommonJS (`require`/`module.exports`) **and** ES module (`import`/`export`) syntax — ESM is automatically converted to CommonJS, including dynamic `import()`
- Relative imports — and `@/…` tsconfig path aliases — of your own `.ts`, `.js`, `.cjs`, `.mjs` and `.json` files, instrumented for inline results across files (multi-file evaluation)
- `fetch` — HTTPS only, credentials never forwarded, responses over 512 KB truncated with a warning. The timeout defaults to the evaluation timeout minus 500 ms (clamped 2–30 s); pin it with `liveeval.execution.fetchTimeout`
- Top-level `await`, async/await, Promises, timers
- Full ES2020+ syntax

**Module access — one simple setting.** Safe read-only builtins (above) and your own local files always work. Everything else — npm packages **and** powerful builtins like `fs`, `child_process`, `net`, `http` — is blocked until you add it to **`liveeval.execution.allowedModules`**. Listing a module is explicit consent, so you grant exactly what you trust and nothing more:

```jsonc
// .vscode/settings.json
"liveeval.execution.allowedModules": ["lodash", "dayjs", "fs"]
```

Requiring anything not listed returns a clear error telling you which setting to add it to. An
ESM-only package needs `liveeval.execution.esmPreload` as well — the error says so when that is
the cause.

**Error output stays yours.** To show inline results Live Eval rewrites your code before running it
— coverage counters, marker capture calls, and a preamble of helper functions. None of that reaches
you when something throws: stack traces are filtered down to frames from code *you* wrote, with line
numbers translated back to your own file, and messages naming an internal helper are scrubbed. What
you see is your error, not ours.

**What's intentionally blocked or limited:**
- `eval()` and `new Function()` — disabled for safety
- `globalThis`, `global`, `process` — no access to the host runtime
- Browser APIs (`document`, `window`, `localStorage`, etc.) — this is a Node.js sandbox, so these are simply **undefined** (exactly as in real Node). `typeof window === 'undefined'` is `true`, so feature-detection code works; actually using `window.foo` throws `ReferenceError: window is not defined`.
- `http://` URLs in `fetch` — HTTPS only
- `import.meta` and top-level module-scope `await` in imported files — not supported

> **Note:** React / JSX / TSX (`.jsx`, `.tsx`) is **not supported** — Live Eval evaluates plain JavaScript and TypeScript only.

**Execution limits** (all configurable):

| Limit | Default |
|-------|---------|
| Evaluation timeout | 5 000 ms |
| `fetch()` timeout | auto (timeout − 500 ms) |
| Recursion depth | 1 000 calls |
| Trace records per function | 50 |
| Trace events per visualizer run | 2 000 |
| Watch history per variable | 10 values |

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Shortcut | Description |
|---------|----------|-------------|
| **LiveEval: Run — Evaluate Current File** | `Ctrl+Shift+Enter` | Evaluate immediately |
| **LiveEval: Toggle Live Auto-Evaluation On/Off** | `Ctrl+Shift+L` | Enable/disable live mode |
| **LiveEval: Clear Inline Results** | — | Remove all inline decorations |
| **LiveEval: Visualize Recursion Tree** | — | Open the call tree for the last `// trace` run |
| **LiveEval: Visualize Promises** | — | Open the Event-loop & Promise Visualizer |
| **LiveEval: Visualize Prototype Chain** | — | Open the prototype-chain panel for an inspected object |
| **LiveEval: Show Console Output Panel** | — | Open the captured console output panel |
| **LiveEval: Show Results Panel** | — | Open the results tree view |
| **LiveEval: Show Output Panel** | — | Open the extension log panel |
| **LiveEval: New JavaScript Scratchpad** | — | New JS file pre-loaded with marker examples |
| **LiveEval: New TypeScript Scratchpad** | — | New TS file pre-loaded with typed examples |
| **LiveEval: Add // ? Marker to Selected Lines** | — | Insert a value marker on each selected line |
| **LiveEval: Export Results to Clipboard** | — | Copy all current inline results as text |
| **LiveEval: Copy Line Value to Clipboard** | — | Copy the value on the line your cursor is on |
| **LiveEval: Toggle Debug Marker (// ?)** | — | Add or remove a `// ?` on the current line |
| **LiveEval: Add Watch Expression** | — | Add a `// watch` for a variable you name |
| **LiveEval: Show Trace Log** | — | Open the recorded `// trace` calls as text |
| **LiveEval: Diagnose Module Resolution** | — | Explain how an `import` / `require` resolved, and why one failed |
| **LiveEval: Clear Console Output** | — | Empty the captured console panel |
| **LiveEval: Clear Results History** | — | Empty the results tree view |
| **LiveEval: Show Status** | — | Display version and feature status |
| **LiveEval: Support the Project** | — | Open the sponsor page |

---

## Configuration

Settings are under `liveeval.*` in VS Code Settings (`Ctrl+,`). Changes apply live — no window reload needed.

### Execution

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.execution.timeout` | `5000` | Max evaluation time (ms) before a slow run is stopped |
| `liveeval.execution.fetchTimeout` | `0` | Time limit (ms) for `fetch()` calls; `0` = auto (execution timeout − 500 ms, clamped 2–30 s) |
| `liveeval.execution.maxCallDepth` | `1000` | Recursion guard — max call-stack depth before execution stops |
| `liveeval.execution.allowedModules` | `[]` | Modules evaluated code may load — npm packages or powerful builtins (`fs`, `child_process`, …). Safe builtins are always available. Listing a module is explicit consent. |
| `liveeval.execution.debug` | `false` | Print internal diagnostic logs to the output panel |

### Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.behavior.evaluationDelay` | `300` | Debounce after typing before re-evaluating (ms). With adaptive delay on, this is the maximum wait |
| `liveeval.behavior.adaptiveDelay` | `true` | Scale the debounce down to what the file actually costs to evaluate. Turn off to always wait the configured delay exactly |
| `liveeval.behavior.evaluateWithoutMarkers` | `false` | Show results for every line automatically — no markers needed (Quokka-style) |
| `liveeval.behavior.stickyResults` | `false` | Keep the last successful results visible while mid-edit; replace only on the next successful run |
| `liveeval.support.showOccasionalAsk` | `true` | Allow one support prompt, ever — after several separate days of use. Set to `false` to never see it |

### Markers & history

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.execution.traceMaxCalls` | `50` | Max call records per `// trace` |
| `liveeval.execution.traceMaxEvents` | `2000` | Max trace events streamed to the recursion visualizer per run, shared across every `// trace` in the file — each traced function is guaranteed a slice, so a hot one cannot use up the whole budget |
| `liveeval.execution.watchHistorySize` | `10` | Values retained per `// watch` across re-evaluations |

### Multi-file projects

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.execution.entryPoints` | `[]` | Explicit entry-point files (e.g. `["src/app.ts"]`) overriding automatic entry detection |
| `liveeval.execution.entryReevalBudgetMs` | `1200` | Time budget (ms) for re-running the whole import graph when a module is edited; `0` disables live module re-runs |
| `liveeval.pathAliases` | `{}` | Manual path-alias map (e.g. `{"@lib/*": "src/lib/*"}`) supplementing auto-detected `tsconfig.json` paths |
| `liveeval.execution.esmPreload` | `[]` | ESM-only packages to load ahead of evaluation so the sandbox's synchronous `require()` can serve them. Also list them in `allowedModules` |

### Console output

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.console.maxDepth` | `6` | Object nesting depth for console output inspection |
| `liveeval.console.filter` | `{"mode":"off","levels":[]}` | Log-level filter: `whitelist` shows only listed levels, `blacklist` hides them (e.g. `{"mode":"blacklist","levels":["debug"]}`) |

### Coverage & editor decorations

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.coverage.style` | `"full"` | Coverage presentation: `full` (badges + dead-line highlight), `quiet` (badges only), `dead-only` (only highlight never-executed lines) |
| `liveeval.features.branchHighlight.enabled` | `true` | `✓`/`✗` taken / not-taken branch badges in the gutter |
| `liveeval.features.promiseLens.enabled` | `true` | Show the ⚡ Visualize Promises CodeLens above async code |

### Recursion visualizer

| Setting | Default | Description |
|---------|---------|-------------|
| `liveeval.visualization.maxEvents` | `5000` | Max call events recorded before the visualizer stops capturing |
| `liveeval.visualization.showTruncationWarning` | `true` | Show a banner in the visualizer when the trace was cut off |
| `liveeval.visualization.showRecursionNotification` | `true` | Offer the visualizer the first time recursion is detected in a file (once per file per session) |
| `liveeval.features.recursionTree.enabled` | `true` | Show the Execution Tree panel |
| `liveeval.features.timeline.enabled` | `true` | Show the Execution Timeline tab |
| `liveeval.features.callStack.enabled` | `true` | Show the Call Stack panel |
| `liveeval.features.backtrack.enabled` | `true` | Show backtracking highlights/animation |
| `liveeval.features.resultsOutput.enabled` | `true` | Show the Results / Console pane |

---

## Troubleshooting

**Results not appearing** — check the status bar shows `$(play) LiveEval`. If it says `LiveEval Disabled`, click it or press `Ctrl+Shift+L`. Make sure the file is a supported language (`.js` or `.ts`) and add a `// ?` marker to a line.

**Decorations look stale** — run `LiveEval: Clear Inline Results`.

**Slow typing** — raise `liveeval.behavior.evaluationDelay` to `500`–`1000` ms.

**Recursion visualizer is empty** — evaluate the file first, and check the function actually recurses: a flat function offers *View Calls* rather than *View Tree*, because there's no tree to draw. If the marker says the function was never called, nothing in the file is calling it.

**`require()` not found** — the sandbox scopes `require` to your workspace root. Open the file inside a VS Code workspace folder.

**Imports fail in a multi-file project** — check that the imported file is part of the workspace and that the relative file path is correct.

**A marker does nothing in an imported file** — only `// ?` and `// trace` report across a module boundary; the other eleven are inert there. Open that file and evaluate it directly if you need the rest.

**An allowed package still won't load** — if the error says `EsmOnlyModuleError`, the package ships ESM only and the sandbox's synchronous `require()` cannot load it. Add it to `liveeval.execution.esmPreload` as well as `allowedModules`.

**A `.tsx` or `.jsx` import doesn't resolve** — React files are unsupported by design. The parser has no JSX support, so those imports report "module not found" rather than crashing the run.

**A traced method says `never called` but clearly ran** — `// trace` can't wrap an individual method inside a class body. Put the marker on the `class` instead, which traces construction and keeps `instanceof`, statics and `.name` intact.

---

## Feedback

Found a bug or have a suggestion? **[Submit feedback](https://forms.gle/psrNnGf6RUh9QFxz7)** — include the code that triggered it, your VS Code version, and OS.

---

## License

Copyright (c) 2026 LiveEvalJS Labs. All rights reserved.

This software is **proprietary and confidential**. The source code is not open source. You may install and use the extension binary distributed via the VS Code Marketplace for personal or internal business purposes only.

You may **not** copy, modify, distribute, sublicense, reverse-engineer, or create derivative works from this software without the prior explicit written permission of LiveEvalJS Labs.

See the [LICENSE](LICENSE) file for the full terms.

---

## Terms & Conditions

By installing or using Live Eval you agree to the following:

**1. Permitted use.** You may install and use the extension on machines you own or control, solely for your own personal or internal business purposes.

**2. Restrictions.** You may not redistribute, resell, sublicense, reverse-engineer, decompile, or create derivative works based on this software without explicit written permission from LiveEvalJS Labs.

**3. Code execution is your responsibility.** Code you evaluate runs on your local machine under your own operating-system user permissions. You are solely responsible for the code you choose to evaluate, including any effects it may have on your system, files, or external services.

**4. No warranty.** This software is provided "as is", without warranty of any kind, express or implied — including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

**5. Limitation of liability.** LiveEvalJS Labs shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from the use or inability to use this software, even if advised of the possibility of such damages.

**6. No warranty of continuity.** The extension may be updated, changed, deprecated, or discontinued at any time without notice.

**7. Security.** While the sandbox is designed to isolate evaluated code, no sandboxing mechanism is unconditionally secure. Do not evaluate untrusted third-party code. Add modules to `liveeval.execution.allowedModules` only in workspaces you fully trust.

**8. No responsibility for misuse.** LiveEvalJS Labs accepts no liability for misuse, including unintended access to external services, leakage of sensitive data, or violations of applicable laws or third-party terms of service.
