# Quokka Lite — Lightweight inline JavaScript evaluator

Quokka Lite is a small, Quokka-like VS Code extension for quickly evaluating marked JavaScript lines inline and visualizing which lines executed.

Features
- Evaluate lines marked with `// ?` or `/*?*/` and show inline results or errors.
- Small gutter icons indicate per-line status: success / info / error.
- Basic coverage visualization (background highlight by default) for executed lines.
- Configurable debounce, timeouts, max evaluations, and display options.

Quick start

1. Install dependencies:

   npm install

2. Build the extension:

   npm run compile

3. Run in the Extension Development Host (press F5 in VS Code) and open a JS file with `// ?` markers.

Configuration (settings namespace `quokkaJsClone`)
- `resultColor` — color for result annotations
- `errorColor` — color for error annotations
- `autoEvaluate` — evaluate automatically on change
- `evaluationDelay` — debounce delay in ms
- `maxEvaluationsPerFile` — safety cap for single-pass evaluations
- `timeoutPerRunMs` — VM timeout per run
- `showErrors` — show inline errors
- `coverageDisplay` — `'background'` (default) or `'gutter'`

Development
- Build: `npm run compile`
- Test: `npm test`
- Run extension host: Press F5 in VS Code

Contributing and License
This repository is intended as a lightweight experimental project. See `LICENSE` for licensing information.

