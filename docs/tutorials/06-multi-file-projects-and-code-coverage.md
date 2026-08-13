# Multi-File Projects: Coverage and Imports

**Level:** Intermediate · **Time:** 7 minutes · **Applies to:** `.js` and `.ts` projects

Most inline-evaluation tools stop at the file you're editing. Real code doesn't: the
function you're debugging lives in `utils.ts` and is called from `app.ts`, and the value
you need to see is two files away from the one you're looking at.

Live Eval evaluates the whole import graph and shows inline results **in every file in
it** — plus per-line execution counts and dead-code highlighting on every run.

![Two VS Code panes side by side: an entry point file importing a helper, and the imported module showing its own inline evaluated values and an execution-count gutter badge](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/tutorials/multi-file.png)

> ### Read this before you put markers in an imported file
>
> **Only `// ?` and `// trace` report from a file you reached through an `import`.** The other
> eleven markers are inert there — `// watch`, `// assert`, `// path`, `// perf`, `// err`,
> `// count`, `// table`, `// ??`, `// log`, `// hit`, `// tag`. The file still executes and its
> coverage gutter still fills in; those markers just report nothing. In the file you have open,
> every marker works.
>
> **Seven extensions resolve:** `.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`. JSX in an
> imported file is transpiled to `React.createElement(...)` before it is parsed, so importing a
> `.jsx`/`.tsx` component works — as long as `react` is resolvable from that file. Note what that
> gets you: the element the component returns, not rendered output. Nothing is mounted, so a
> component that calls a hook throws when called directly. See
> [tutorial 5](05-live-typescript-evaluation.md#frequently-asked-questions) for the whole picture.

## Step 1 — Import your own code

```typescript
// src/math.ts
export function vat(amount: number) {
  return amount * 0.2;  // ? → 9.998
}
```

```typescript
// src/app.ts
import { vat } from "./math";
const tax = vat(49.99);  // ? → 9.998
tax.toFixed(2);          // ? → "10.00"
```

Evaluate `app.ts` and the marker inside `math.ts` fills in too — with the value from the
call that actually happened, not a guess. Relative imports of your `.ts`, `.js`, `.cjs`,
`.mjs` and `.json` files all work, with or without the extension written out.

## Step 2 — Use your path aliases

Aliases from the nearest `tsconfig.json` (`@lib/*`, `@src/*`) are detected automatically:

```typescript
import { formatMoney } from "@lib/money";
```

Add or override mappings with `liveeval.pathAliases`, e.g.
`{"@lib/*": "src/lib/*"}`.

## Step 3 — Edit a module and keep seeing results

Here's the problem that trips up multi-file evaluation: if you're editing `math.ts`,
there's nothing in `math.ts` to *run*. It only exports.

Live Eval resolves this by finding the runnable entry point for the module you're editing
and re-running that, so your inline results stay live while you edit a leaf file. If the
guess is wrong, or you have several entry points, pin it:

```jsonc
// .vscode/settings.json
"liveeval.execution.entryPoints": ["src/app.ts"]
```

On a large graph, re-running everything on every keystroke would make typing sluggish, so
`liveeval.execution.entryReevalBudgetMs` (default 1200 ms) caps the effort — past the
budget, Live Eval refreshes from the last run instead of re-executing. Set it to `0` to
disable live module re-runs entirely.

## Step 4 — Read the coverage gutter

Every evaluation records which lines ran and how many times. Executed lines get a count
badge in the gutter; lines that never ran are highlighted.

```javascript
function grade(score) {          // ×3 — entered once per call
  if (score >= 90) return "A";   // ×1 — only grade(95) took this branch
  if (score >= 70) return "B";   // ×1 — only grade(80) took this branch
  if (score >= 50) return "C";   // ×1 — only grade(60) took this branch
  return "F";                    // never executed — no call fell through this far
}

grade(95); grade(80); grade(60);
```

The badge on a braceless `if (cond) return X;` line counts how many times *that branch's
return actually ran* — not how many times the condition was checked — so each distinct
branch above reads ×1 even though the function itself ran three times. `return "F"`'s
highlight means exactly what it says: nothing this run made it that far.

That highlight is the fastest dead-code detector you have. It answers two questions
constantly worth asking:

- **"Is this branch reachable?"** If it stays highlighted no matter what you feed the
  function, it may be unreachable — or your inputs never cover it, which is the same
  signal a missing test would give you.
- **"Did my change get executed?"** Edit a line and re-evaluate. No badge means the code
  path you just wrote never ran, and any conclusion you draw from the run is about the
  old path.

Tune how loud this is with `liveeval.coverage.style`:

| Value | Shows |
|-------|-------|
| `full` (default) | Count badges **and** highlighted never-executed lines |
| `quiet` | Gutter badges only — no line highlight |
| `dead-only` | Only the never-executed highlight |

Branch badges (`✓` taken / `✗` not taken on `if`/`else`) toggle with
`liveeval.features.branchHighlight.enabled`.

## Step 5 — Combine coverage with `// path`

Coverage tells you which *lines* ran; `// path` (see
[tutorial 3](03-visualize-recursion-in-javascript.md)) tells you which *branches* did,
and how often. Used together on the same function, they turn "I think this handles the
empty case" into a fact you can see.

## Modules and security

Your own files always load. Everything else is opt-in:

- **Always available:** safe Node built-ins — `path`, `crypto`, `util`, `url`,
  `querystring`, `events`, `buffer`, `stream`, `os`, with or without the `node:` prefix.
- **Blocked until you allow it:** npm packages *and* powerful built-ins like `fs`,
  `child_process`, `net`, `http`.

```jsonc
// .vscode/settings.json
"liveeval.execution.allowedModules": ["lodash", "dayjs", "fs"]
```

Listing a module is explicit consent — you grant exactly what you trust. Requiring
anything unlisted returns a clear error naming the setting to add it to. Only grant
modules in workspaces you trust; evaluated code runs on your machine with your
permissions.

## When an allowed package still won't load

You listed the package, it's installed, and the line still fails. There is one common cause, and
Live Eval names it rather than making you guess:

```
EsmOnlyModuleError: Cannot load 'nanoid': it is an ES module, and the evaluation
sandbox's require() is synchronous. This is not a permissions or installation
problem — the package is allowed and installed.
```

Modern packages increasingly ship ESM only. The sandbox's `require()` cannot load one, because
loading an ES module is asynchronous and `require()` is not. The fix is to have the extension
host load it *before* evaluation starts:

```jsonc
// .vscode/settings.json
{
  "liveeval.execution.allowedModules": ["nanoid"],
  "liveeval.execution.esmPreload":     ["nanoid"]
}
```

`esmPreload` does not replace `allowedModules` — a package needs to be in **both**. The allow-list
is consent; the preload is mechanism.

```javascript
const { nanoid } = require('nanoid');
nanoid(8).length;  // ? → 8
```

Only reach for this when the error above tells you to. A package with a CommonJS entry point
loads from `allowedModules` alone, and preloading it is wasted startup time.

## Frequently asked questions

**Do imported files need to be saved?** No — unsaved edits in open modules are picked up,
so results don't go stale mid-edit.

**Can I import from `node_modules`?** Only packages you've listed in
`liveeval.execution.allowedModules`.

**Does a marker inside a module that never gets called show anything?** No — and that
absence is information: the line never ran. Check the gutter to confirm.

**I put `// watch` in an imported file and nothing happened.** Expected: only `// ?` and
`// trace` report from imported files (see the box at the top). If you need another marker there,
open that file and evaluate it directly.

**Why is my imported module's top-level `await` failing?** Top-level `await` works in the
file you're editing, but not in imported modules.

**Does this replace Istanbul/nyc?** No. This is live, single-run coverage for the code in
front of you, not a project-wide report for CI.

## Where to next

You've now seen the whole feature set. The
[main README](../../README.md) has the complete reference for every marker, command, and
setting — and the [tutorial index](README.md) if you want to revisit any step.
