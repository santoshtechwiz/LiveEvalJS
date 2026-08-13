# Live TypeScript Evaluation in VS Code

**Level:** Beginner · **Time:** 5 minutes · **Applies to:** `.ts` files

Running a TypeScript snippet normally means a `tsconfig`, a compile step, and a `node`
invocation — or pasting into the TS Playground and losing your project's types. Live Eval
evaluates TypeScript directly in the editor: types are stripped at evaluation time,
results are mapped back to your original lines, and the annotation lands next to the code
you wrote.

![VS Code editor showing a TypeScript file with an interface, a typed const, a template literal, and a typed function, each annotated with its evaluated value inline](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/tutorials/typescript.png)

## It's the same `// ?`

```typescript
interface Point { x: number; y: number }

const origin: Point = { x: 0, y: 0 };        // ? → {x: 0, y: 0}
const label = `(${origin.x}, ${origin.y})`;  // ? → "(0, 0)"

function scale(p: Point, k: number): Point {
  return { x: p.x * k, y: p.y * k };
}
scale({ x: 2, y: 3 }, 4);                    // ? → {x: 8, y: 12}
```

Every marker from [tutorial 2](02-debug-javascript-without-console-log.md) — `// ??`,
`// watch`, `// assert`, `// trace`, `// path`, `// perf` — works identically in `.ts`.

Start from a working file with **LiveEval: New TypeScript Scratchpad**.

## How the line numbers stay correct

Your TypeScript is transpiled to JavaScript before it runs, and transpilation *deletes*
lines — `interface`, `type`, and other type-only declarations vanish. Live Eval remaps
results back through source maps, so an annotation always lands on the line you wrote,
even when several lines above it disappeared during compilation.

This is why you can put an `interface` block anywhere in the file and the markers below
it stay aligned.

## What runtime types do and don't tell you

An important distinction, and one Live Eval is unusually good at teaching:

```typescript
const id = "42" as unknown as number;
typeof id;      // ? → "string"
id * 2;         // ? → 84
```

TypeScript believes `id` is a `number`. At runtime it's a string, and `*` coerces it.
Live Eval reports what actually happened, not what the type annotation claimed — which
makes it a fast way to check whether an assertion, a cast, or an `any` from a third-party
API is lying to you.

Type *errors* are still the compiler's job: Live Eval strips types rather than checking
them, so a snippet that fails `tsc` may still evaluate. Your editor's TypeScript
diagnostics keep working exactly as before, side by side with the inline values.

## Generics, classes, enums

All of it runs — generics erase, classes and enums compile to real runtime values:

```typescript
function first<T>(xs: T[]): T | undefined { return xs[0]; }
first([10, 20, 30]);        // ? → 10
first(["a", "b"]);          // ? → "a"

enum Status { Draft, Live }
Status.Live;                // ? → 1
Status[1];                  // ? → "Live"   ← the reverse mapping enums compile to
```

Decorators and other flags follow your nearest `tsconfig.json`.

## Working with your project's modules

Relative imports and `tsconfig.json` path aliases (`@lib/db`, `@src/*`) resolve
automatically, so you can pull in your real code instead of a copy of it:

```typescript
import { formatMoney } from "@lib/money";
formatMoney(1234.5);  // ? → "$1,234.50"
```

Coverage works inside those imported modules, and so do `// ?` and `// trace` — but only
those two markers. See [tutorial 6](06-multi-file-projects-and-code-coverage.md).

## Frequently asked questions

**Do I need a `tsconfig.json`?** No. One is used if present (for path aliases and
compiler options), but a standalone `.ts` file evaluates fine.

**Are `.tsx` and React supported?** Partly, and it's worth knowing where the line is.
`.tsx`/`.jsx` files evaluate: JSX is transpiled the same way type annotations are, so it
reaches the evaluator as plain `React.createElement(...)` calls, and `react` must be
resolvable from your file (the same constraint any bundler has). Imports of `.tsx`/`.jsx`
files resolve too.

What you see is the **element** a component returns, which you can open up like any other
value:

```tsx
function Card({ title }: { title: string }) {
  return <div className="card"><h2>{title}</h2></div>;
}
const card = Card({ title: 'Hello' });
card.type;                            // ?  "div"
card.props.children.props.children;   // ?  "Hello"
```

What you do **not** get is rendering — there is no DOM and no renderer, so a component is
never mounted. The practical consequence is hooks: calling `Counter()` directly throws
`Cannot read properties of null (reading 'useState')`, because a hook needs the dispatcher
that only exists while a renderer runs. That is React's rule, not ours.

If you need a component with hooks to actually run, render it rather than call it. With
`react-dom` installed and added to `liveeval.execution.allowedModules`:

```tsx
const { renderToString } = require('react-dom/server');
renderToString(<Counter />);   // ?  "<em>7</em>"   — useState works here
```

`useEffect` still won't fire; server rendering never commits, exactly as on a real server.
So: good for checking what a component builds from given props, not a substitute for
running your app in a browser.

**Can I use top-level `await`?** Yes, in the file you're editing — no wrapper needed. It
is *not* supported in imported modules.

**Are `import.meta` and Node's ESM specifics available?** `import.meta` is not supported.
ESM syntax is converted to CommonJS under the hood, including dynamic `import()`.

## Next

→ [Tutorial 6: Multi-File Projects — Coverage and Imports](06-multi-file-projects-and-code-coverage.md)
