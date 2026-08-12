# Getting Started: See JavaScript Values Inline in VS Code

**Level:** Beginner · **Time:** 2 minutes · **Applies to:** `.js` and `.ts` files

Running a JavaScript snippet usually means saving the file, switching to a terminal,
typing `node file.js`, reading the output, switching back, and editing again. Live Eval
removes every step in that loop: you write an expression, and its value appears on the
same line, as you type.

This tutorial gets you from a blank file to your first inline result.

![VS Code editor showing JavaScript array and string expressions with their evaluated values displayed inline after // ? markers](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/tutorials/inline-values.png)

## Step 1 — Install Live Eval

Install [Live Eval from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=liveevaljs-labs.liveevaljs),
or press `Ctrl+P` in VS Code and run:

```
ext install liveevaljs-labs.liveevaljs
```

Live Eval activates automatically when you open a JavaScript or TypeScript file. The
status bar shows `$(play) LiveEval` when live evaluation is on.

## Step 2 — Open a file to experiment in

You don't need a project. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and
run **LiveEval: New JavaScript Scratchpad** — you get an untitled JS file pre-loaded
with marker examples. (**LiveEval: New TypeScript Scratchpad** does the same for TS.)

Any existing `.js` or `.ts` file works just as well.

## Step 3 — Add your first `// ?` marker

Type an expression and end the line with `// ?`:

```javascript
const prices = [12.5, 8.0, 24.99, 5.5];
prices.filter(p => p > 10);        // ? → [12.5, 24.99]  ▁█
prices.reduce((a, b) => a + b, 0); // ? → 50.989999999999995
"hello".toUpperCase();             // ? → "HELLO"
```

The result appears to the right of the line, greyed out, about 300 ms after you stop
typing. It is a decoration — it is never inserted into your file, so your code stays
exactly as you wrote it.

That `50.989999999999995` is not a bug in the tutorial. It's IEEE-754 floating-point
arithmetic, and seeing it immediately — instead of after a customer complains about a
one-cent discrepancy — is the point of evaluating inline.

## Step 4 — Watch it update as you type

Change `p > 10` to `p > 20`. The inline result becomes `[24.99]` without you saving,
running, or clicking anything. Live Eval re-evaluates on a debounce (300 ms by default,
configurable via `liveeval.behavior.evaluationDelay`).

## Step 5 — Know your controls

| Action | How |
|--------|-----|
| Evaluate now, without waiting | `Ctrl+Shift+Enter` |
| Turn live evaluation on/off | `Ctrl+Shift+L`, or click the status bar item |
| Remove all inline results | **LiveEval: Clear Inline Results** |
| Add `// ?` to several lines at once | Select the lines → **LiveEval: Add // ? Marker to Selected Lines** |
| Copy the value on the current line | **LiveEval: Copy Line Value to Clipboard** |

## What runs your code

Your snippet executes in an isolated Node.js `vm` sandbox — a fresh global scope per
document, with a 5-second timeout and a 1000-call recursion guard. It cannot touch VS
Code itself. Safe built-ins (`path`, `crypto`, `util`, `os`, …) are available; `fs`,
`child_process`, and npm packages are blocked until you list them in
`liveeval.execution.allowedModules`. Browser globals like `window` and `document` do not
exist, because this is Node, not a browser.

## Frequently asked questions

**Do I need to save the file?** No. Live Eval evaluates the in-editor buffer, including
untitled scratchpads.

**Does `// ?` change how my code runs?** No. Markers are ordinary comments. Remove the
extension and the file still runs identically.

**Can I see values without adding markers at all?** Yes — turn on
`liveeval.behavior.evaluateWithoutMarkers` and every line reports its value.

**Nothing is showing up.** Check the status bar for `LiveEval Disabled` (press
`Ctrl+Shift+L`), and confirm the file is `.js`, `.ts`, `.jsx`, or `.tsx` — all four are
supported.

## Next

→ [Tutorial 2: Debug JavaScript Without `console.log`](02-debug-javascript-without-console-log.md)
— the full marker set: deep inspection, variable history, inline assertions.
