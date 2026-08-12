# Visualize Recursion in JavaScript

**Level:** Intermediate · **Time:** 7 minutes · **Applies to:** `.js` and `.ts` files

Recursion is hard to debug for a specific reason: the interesting information — how the
calls nest, which arguments repeat, where the base case fires — lives in the *shape* of
the call tree, and a stack trace only ever shows you one path through it.

Live Eval records every call and draws the whole tree.

![VS Code editor showing a recursive fibonacci function annotated with a trace marker reporting 177 calls, and a classify function with branch coverage counts and a never-executed return highlighted](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/tutorials/recursion.png)

## Step 1 — Add `// trace`

Put `// trace` on the function's definition line or its closing brace:

```javascript
function fib(n) {
  return n <= 1 ? n : fib(n - 1) + fib(n - 2);
} // trace
fib(10);  // ? → 55
```

The inline annotation immediately tells you the cost: **177 calls** to compute
`fib(10)`. Change `10` to `12` and watch that number jump to 465. That exponential blowup
is the classic teaching example, and here you see it as a number that moves while you
type rather than as a claim in a textbook.

## Step 2 — Open the visualizer

Run **LiveEval: Visualize Recursion Tree** from the Command Palette (`Ctrl+Shift+P`).
A panel opens with the recorded run.

Four views of the same data:

- **Call tree** — the literal nesting. Each node shows arguments, return value, depth,
  and duration. This is where you see the base case terminating each branch.
- **DAG** — identical subtrees collapsed into one node. For `fib`, the tree explodes but
  the DAG stays small, which *is* the argument for memoization, drawn.
- **Timeline** — calls plotted by entry time, so you can see the depth-first order the
  engine actually used.
- **Minimap** — the whole run at a glance when the tree is too big to scroll.

Step through calls one at a time, or press Play to animate the descent and unwind at an
adjustable speed.

## Step 3 — Read the memoization estimate

The visualizer reports how many of those calls were redundant — repeated calls with
arguments already computed. For `fib(10)`, most of the 177 are. Add the cache:

```javascript
const memo = new Map();
function fib(n) {
  if (memo.has(n)) return memo.get(n);
  const r = n <= 1 ? n : fib(n - 1) + fib(n - 2);
  memo.set(n, r);
  return r;
} // trace
fib(10);  // ? → 55
```

Re-evaluate: **177 calls become 19**. You've verified the optimization worked without
writing a benchmark, and the tree collapses from a bush to a spine.

## Step 4 — Trace non-recursive functions too

`// trace` isn't only for recursion. On any function it records each call's arguments,
return value, and timing, which is the fastest way to answer "who calls this, and with
what?" without a breakpoint. The trace log is available via **LiveEval: Show Trace Log**.

## Where `// trace` goes

Placement is the one thing people get wrong, and a misplaced marker looks like a broken feature.
Four placements work:

```javascript
function fib(n) { // trace          ← on the definition line
  return n < 2 ? n : fib(n-1) + fib(n-2);
}

function outer(a) {
  return a + 1;
} // trace                          ← or on the closing brace

const arrow = (x) => x * 2; // trace   ← arrow functions, on the assignment

class Repo { // trace               ← a whole class: counts constructions
  constructor(n) { this.n = n; }
  static of(n) { return new Repo(n); }
}
```

Tracing a class wraps the constructor while leaving the class itself intact — `instanceof`,
`Repo.name`, statics and the prototype chain all keep working, so you can trace a class without
changing how the rest of the file behaves.

**One placement does not work: an individual method inside a class body.**

```javascript
class Cache {
  get(k) { // trace   ← reports "⟳ get: never called" even when it ran
    return k.length;
  }
}
new Cache().get('abc');  // ? → 3      ← it plainly did run
```

Trace the whole class instead, or `// trace` a standalone function and call it from the method.
Watch for the giveaway: `never called` next to a method you know executed means the marker is in
the one place it can't reach, not that your code didn't run.

## `// path` — which branches actually ran

Recursion bugs are often base-case bugs, and base-case bugs are branch bugs. `// path`
reports which branches a function took and how many times:

```javascript
function classify(n) {
  if (n > 0) return "pos";
  else if (n < 0) return "neg";
  else return "zero";
} // path
classify(5); classify(-3);
// → [PATH] ⬡ 2/3 paths · missed: else (line 4) (2 calls)
```

Two of three branches ran; `return "zero"` never did, and the report names it by line. That's
your missing test case, identified without a coverage tool — feed it a `0` and the annotation
becomes `[PATH] ⬡ all 3 paths hit (3 calls)`.

The count covers every branch the function *contains*, not just the ones that ran, so a branch
you never exercise is reported rather than silently absent. A function that was never called at
all says `⬡ not called`.

## Limits worth knowing

Tracing everything would be unbounded, so Live Eval caps it — and tells you when a cap
was hit rather than silently truncating:

| Limit | Setting | Default |
|-------|---------|---------|
| Call records kept per function | `liveeval.execution.traceMaxCalls` | 50 |
| Trace events streamed per run | `liveeval.execution.traceMaxEvents` | 2000 |
| Events recorded by the visualizer | `liveeval.visualization.maxEvents` | 5000 |
| Recursion depth before execution stops | `liveeval.execution.maxCallDepth` | 1000 |

If a run was truncated, the visualizer shows a banner (toggle with
`liveeval.visualization.showTruncationWarning`). Raise the caps for a deep run — but
expect the panel to get slower, since it's drawing every node.

Individual panels (execution tree, timeline, call stack, backtracking animation, results
pane) can be switched off independently via the `liveeval.features.*` settings if you
want a leaner view.

## Good candidates to try

Tree recursion, backtracking, and divide-and-conquer are where the tree view earns its
keep:

- **N-Queens / Sudoku** — backtracking is detected and animated: you literally watch the
  algorithm reach a dead end and unwind.
- **Merge sort / quicksort** — the balanced split is obvious in the tree; a bad pivot is
  equally obvious as a lopsided one.
- **Tower of Hanoi** — the perfectly symmetric tree every course describes.
- **Permutations** — the factorial fan-out, and where pruning would cut it.

## Frequently asked questions

**The visualizer is empty.** Evaluate the file first (`Ctrl+Shift+Enter`), confirm the
function actually recursed, and check `// trace` is on the definition or closing-brace
line.

**Does tracing change timings?** Yes, slightly — wrapping adds overhead. Use `// perf`
for real measurements and `// trace` for structure.

**Can I trace an async function?** Yes; pending calls are shown as in-flight until they
settle.

## Next

→ [Tutorial 4: Understand the JavaScript Event Loop & Promises Visually](04-javascript-event-loop-and-promise-visualizer.md)
