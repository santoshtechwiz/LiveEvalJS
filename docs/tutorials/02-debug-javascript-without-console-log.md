# Debug JavaScript Without `console.log`

**Level:** Beginner · **Time:** 6 minutes · **Applies to:** `.js` and `.ts` files

`console.log` debugging has a cost you stop noticing: you edit the file to add a log,
run it, read a terminal, then edit the file again to remove the log. Live Eval's markers
give you the same information without either edit surviving into your code — they're
comments, so they never change behavior, and the values render in the editor next to
the line that produced them.

This tutorial walks through every marker and when to reach for it.

![VS Code editor showing Live Eval markers: watch tracking a running total across loop iterations, a loop sparkline, passing and failing inline assertions, and captured console output](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/tutorials/markers.png)

## The marker cheat sheet

| Marker | Shows | Reach for it when | In imported files |
|--------|-------|-------------------|:---:|
| `// ?` | The value of the expression | Default. "What is this right now?" | ✅ |
| `// ??` | Type, keys, prototype chain | The value is an object and you don't know its shape | — |
| `// watch` | Every value a variable takes | The variable changes inside a loop | — |
| `// assert` | Green `✓ OK`, or red with the value | You want a check without a test runner | — |
| `// trace` | Every call to a function — args, return, timing | Recursion, or a function called from many places | ✅ |
| `// path` | Which branches were taken, how often | An `if`/`else` chain you think is wrong | — |
| `// perf` | ops/sec and average time | Comparing two implementations | — |
| `// err` | The caught error, or `✓ no throw` | You expect this line to throw — or want to prove it doesn't | — |
| `// log` | Only the `console.log` output | The return value is noise | — |
| `// count` | How many times the line ran | "Is this executing twice?" | — |
| `// table` | The value as a formatted table | Arrays of objects | — |
| `// hit` | A reach count, plus a mark on the trace timeline | Tracking which path a traced run took | — |
| `// tag` | Same as `// hit` — an alias | Same | — |

> **Markers and imported files.** Only `// ?` and `// trace` report from a file you reached
> through an `import`. Put any other marker there and it is inert — the file still runs and its
> coverage still shows, the marker just reports nothing. Every marker works normally in the file
> you have open. See [Multi-file projects](06-multi-file-projects-and-code-coverage.md).

## `// ?` — the value of an expression

Put it on any line whose value you care about:

```javascript
const user = { name: "Alice", roles: ["admin"] }; // ? → {name: "Alice", roles: ["admin"]}
user.roles.includes("admin");                     // ? → true
```

Inside a loop, one marker collects **every** iteration and draws a sparkline of the
trend:

```javascript
for (const n of [1, 2, 3, 4, 5]) {
  n * n;  // ? → 1  4  9  16  25  ▁▂▃▅█
}
```

That one line replaces a `console.log` plus scrolling through five lines of terminal
output.

## `// ??` — deep inspection

`// ?` prints a value. `// ??` explains it: constructor, own properties, inherited
properties, and the full prototype chain.

```javascript
class Order { constructor(id) { this.id = id; } total() { return 0; } }
new Order(7);  // ??
```

The hover card reports the value's type and constructor, its own properties, and each
link in the prototype chain up to `Object.prototype` — including where `total` actually
lives.

Use it when a method "should exist" but doesn't, or when you're reading unfamiliar
objects. For a clickable, navigable version, run **LiveEval: Visualize Prototype Chain**
from the Command Palette.

## `// watch` — a variable's history

`// ?` shows a value at a moment. `// watch` shows a variable's whole story, and it
persists across re-evaluations so you can watch it change as you edit:

```javascript
let total = 0;
for (const n of [1, 2, 3, 4, 5]) {
  total += n;  // watch → total: 1 → 3 → 6 → 10 → 15  ▁▂▄▆█
}
```

This is the marker that replaces the classic "log the accumulator inside the loop"
move. History depth is capped by `liveeval.execution.watchHistorySize` (default 10).

`// watch` also follows what the line *does*, not just assignments — a counter it moves, a
collection it pushes to, a key it sets:

```javascript
count++;              // watch → count: 1 → 2 → 3  ▁▅█
items.push(value);    // watch → items: [1] → [1,2] → [1,2,3]
byKey.set(k, v);      // watch → byKey: Map(1){"a"⇒1} → Map(2){"a"⇒1, "b"⇒2}
```

**Sampling a long loop.** Ten thousand iterations make an unreadable history. Give the marker a
number and it keeps every Nth value:

```javascript
let t = 0;
for (let i = 1; i <= 10; i++) {
  t += i;  // watch 3 → t: 6 → 21 → 45  ▁▄█
}
```

`// watch 1` is the same as plain `// watch`.

## `// assert` — a test runner you don't have to set up

```javascript
function add(a, b) { return a + b; }

add(2, 3) === 5;  // assert → ✓ OK
add(2, 3) === 6;  // assert → ✗ false
```

A pass is green, a failure is red and bold, and both mark the gutter — so a wall of asserts is
scannable without reading any of them. The failure shows the expression's own value, so drop the
comparison when you want to see the number itself:

```javascript
add(2, 3);  // assert → ✓ OK    ← truthy, but tells you nothing about what it is
add(2, 3);  // ?      → 5       ← pair them while you're still working out the answer
```

This isn't a replacement for Jest, but for checking an algorithm while you write it, it's faster
than any test file.

## `// err` — did this line throw?

`// ?` on a throwing line shows you the error, but it also stops being a value. `// err` is the
inverse marker: it catches whatever the line throws and reports it, and reports success just as
loudly.

```javascript
JSON.parse('{ not json }');   // err → SyntaxError: Expected property name or '}' in JSON at position 2
JSON.parse('{"ok":true}');    // err → ✓ no throw
```

The line still runs — `// err` only swallows the throw so the rest of the file keeps evaluating.
That is the point: it lets you park a marker on a line you *expect* to be fragile and see, at a
glance, whether today's edit made it throw.

Two ways it earns its place:

```javascript
// Proving a guard actually guards.
function parseConfig(text) {
  return text ? JSON.parse(text) : {};
}
parseConfig('');       // err → ✓ no throw
parseConfig('nope');   // err → SyntaxError: Unexpected token 'o', "nope" is not valid JSON
```

```javascript
// Keeping evaluation alive past a known-bad line, so the lines below still report.
riskyMigration(rows);  // err
summarize(rows);       // ? → {migrated: 0, skipped: 12}
```

Without `// err` on the first line, the throw ends the run and the `// ?` below it shows nothing.

## `// hit` and `// tag` — which branch did it take?

`// hit` counts how many times a line was reached, and `// tag` is the same marker under a
friendlier name. Put them on the `return`s of a branchy function to see the shape of a run:

```javascript
function classify(n) { // trace → ⟳ classify  ×4  [hit ×4]
  if (n < 0) {
    return 'negative';   // tag negative-branch → [COUNT] 1×
  }
  if (n === 0) {
    return 'zero';       // hit → [COUNT] 1×
  }
  return 'positive';     // tag positive-branch → [COUNT] 2×
}
[3, -1, 0, 8].map(classify);  // ? → ["positive", "negative", "zero", "positive"]
```

Two things worth knowing:

- **The label is decoration.** `// tag negative-branch` and a bare `// tag` behave identically —
  the words after the marker are for you reading the file, not for Live Eval. They do make the
  code readable, which is why the alias exists.
- **The count always shows; the timeline entry does not.** The reach count works anywhere. The
  *event on the recursion timeline* — the thing that lets you replay which path a specific call
  took — is only recorded inside a function carrying `// trace`, and it is attributed to that
  call. Drop the `// trace` from the example above and the three counts are unchanged; you just lose
  the ordering.

`// count` does the counting without the trace-timeline half. Reach for `// hit`/`// tag` when
you're already tracing.

## `// log` — output without the return value

Live Eval annotates `console.log` lines automatically. Use `// log` when you want *only*
the logged output and not the expression's return value:

```javascript
console.log("checkout ready");  // log → ❯ checkout ready
```

Full console output — including objects expanded to `liveeval.console.maxDepth` levels —
goes to the panel opened by **LiveEval: Show Console Output Panel**. You can filter noisy
levels with `liveeval.console.filter`, e.g. `{"mode":"blacklist","levels":["debug"]}`.

## `// count` and `// table`

`// count` answers "did this run once or twice?" — it reports how many times the line
executed in a single evaluation pass, which is how you catch an accidental double
invocation or an effect firing twice.

`// table` renders the value as a table in the hover card, which is the readable way to
look at an array of objects:

```javascript
const rows = [
  { sku: "A-1", qty: 2 },
  { sku: "B-7", qty: 5 },
]; // table
```

## `// perf` — benchmark in place

```javascript
[...Array(1000).keys()].map(Math.sqrt);  // perf → [PERF] 38,610 ops/s · avg 25.90μs · 3,861 runs
```

Put `// perf` on two competing implementations and compare them without writing a
benchmark harness. Treat the numbers as relative, not absolute: they're measured in a
sandbox under a timeout, so they're good for "A is 4× B" and not for publishing.

## A workflow that works well

1. `// ?` on the line you suspect.
2. If the value is an object you don't recognize, upgrade it to `// ??`.
3. If it's wrong and it's in a loop, add `// watch` to the accumulator.
4. Once you know the correct behavior, freeze it with `// assert` so you'd notice a
   regression while editing.

Because markers are comments, you can leave step 4 in the file — or strip every marker
in a file at once with **LiveEval: Clear Inline Results** and a find-replace.

## Frequently asked questions

**Do markers slow my real program down?** They can't — they only mean anything to Live
Eval. In your actual runtime they're comments.

**Can I put a marker on a multi-line expression?** Yes. Put it on the last line of the
statement, or use a block comment `/* ? */` at the end.

**Why does my `// ?` show nothing?** The line probably never executed — check for a
dead-code highlight on it (see [tutorial 6](06-multi-file-projects-and-code-coverage.md)).

## Next

→ [Tutorial 3: Visualize Recursion in JavaScript](03-visualize-recursion-in-javascript.md)
— what `// trace` unlocks.
