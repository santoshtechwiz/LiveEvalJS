# Understand the JavaScript Event Loop & Promises Visually

**Level:** Intermediate · **Time:** 8 minutes · **Applies to:** `.js` and `.ts` files

Nearly every JavaScript developer has read that "the microtask queue drains before the
next macrotask." Far fewer could point at a line of their own code and say which queue it
lands in. The gap exists because the event loop is invisible: you see the output order
and have to infer the machine that produced it.

Live Eval's Promise Visualizer records a real run of *your* file and replays it — call
stack, Web APIs, both queues, and every Promise state transition — with real millisecond
offsets.

## Step 1 — Write some async code

```javascript
function fetchData() {
  return new Promise(resolve => {
    setTimeout(() => resolve('Data received'), 2000);
  });
}

async function main() {
  const data = await fetchData();
  console.log(data);
}

main();
console.log('Request sent...');
```

## Step 2 — Open the visualizer

Run **LiveEval: Visualize Promises** from the Command Palette with that file open.

![Promise Visualizer event loop view showing the JavaScript call stack, Web APIs holding a pending setTimeout, the microtask queue, the callback queue, and Promise state cards](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/pv-loop.png)

## Step 3 — Read the four regions

- **Call Stack** — synchronous frames, pushed and popped as they run.
- **Web APIs** — work handed off to the host: pending `setTimeout`s, in-flight async
  operations. Nothing here is "in JavaScript" — that's the whole point.
- **Microtask Queue** — resolved `.then()` callbacks and `await` continuations.
- **Callback Queue** — fired macrotask callbacks waiting for the stack to clear.

Plus a card per Promise, tracking create → pending → fulfilled/rejected, including for
`Promise.all`, `Promise.race`, `Promise.allSettled`, and `Promise.any`.

## Step 4 — Follow the actual timeline

Stepping through the run above produces this sequence — these are real recorded events,
with their real `+ms` offsets:

| Step | +ms | Event | What it means |
|------|-----|-------|---------------|
| 1 | 0 | `fn_enter main` | `main()` is called |
| 2 | 0 | `fn_enter fetchData` | still synchronous |
| 3 | 0 | `create` | the Promise is constructed, **pending** |
| 5 | 0 | `web_api_add setTimeout(2000ms)` | the timer moves to Web APIs — JS is done with it |
| 7 | 0 | `fn_exit fetchData` | returns the pending Promise |
| 8 | 0 | `await_pause main` | `main` suspends; the stack unwinds |
| 9 | 0 | `console "Request sent..."` | **the last line of the file runs second** |
| 10 | 2009 | `macro_fire setTimeout` | two seconds later the timer callback fires |
| 11 | 2009 | `resolve → fulfilled` | the Promise settles with `Data received` |
| 13 | 2009 | `await_resume main` | `main` continues where it paused |
| 14 | 2009 | `console "Data received"` | logged +2009 ms after the first log |

Step 9 is the lesson. `console.log('Request sent...')` is written *after* `main()` yet
runs at +0 ms, while the `console.log` inside `main` waits 2 seconds — because `await`
didn't block anything, it suspended one function and returned control to the caller.
The two-second gap between adjacent rows is the visible proof.

## Step 5 — Switch to Timeline view

The Event Loop view shows the machine at an instant. The Timeline view shows the whole
run as one story, grouped by phase — synchronous run, macrotasks, microtask drains —
with each event stamped by real elapsed time.

![Promise Visualizer timeline view showing the run grouped into synchronous, macrotask, and microtask phases with millisecond offsets](https://raw.githubusercontent.com/santoshtechwiz/LiveEvalJS/main/media/pv-timeline.png)

These phases aren't guessed from the source. They're derived from boundary events
recorded during execution, so nested and interleaved async code groups correctly.

Use the controls to step forward and back, or press Play to animate at adjustable speed.

## Experiments worth running

Change one thing at a time and re-run the visualizer — each of these produces a visibly
different picture:

1. **`Promise.resolve().then(...)` vs. `setTimeout(..., 0)`** in the same file. The
   `then` drains before the timer fires, every time. This is "microtasks beat macrotasks"
   as a picture instead of a rule.
2. **`Promise.all` vs. sequential `await`s** over three delays. `all` shows three
   overlapping bars; sequential shows a staircase — and the total time difference is
   right there in the offsets.
3. **`Promise.race`** — watch the losing promise stay pending forever after the race
   settles. It was never cancelled; nothing in JavaScript cancels it.
4. **A rejection with no `.catch`** — watch it settle to rejected with nothing waiting on
   it.
5. **A blocking `for` loop before an awaited call** — the stack never clears, so nothing
   in either queue can run. This is what "blocking the event loop" actually looks like.

## Frequently asked questions

**Does it visualize real timers, or a simulation?** Real. Your code executes in the
sandbox and the visualizer replays the events that execution actually produced —
including real elapsed milliseconds.

**Can I use `fetch`?** Yes — HTTPS only, credentials never forwarded, and responses capped at
512 KB (anything larger is truncated with a warning rather than failing). The request timeout
defaults to your evaluation timeout minus 500 ms, clamped to 2–30 s — so 4.5 s at the default
settings. Set `liveeval.execution.fetchTimeout` to pin it.

**Nothing shows up.** The panel must be open when the file is evaluated — open it via
**LiveEval: Visualize Promises**, then re-evaluate with `Ctrl+Shift+Enter`. And the file
needs some async work to record: Promises, `async`/`await`, or timers.

**Why is my 2000 ms timer at +2009 ms?** Because `setTimeout` guarantees a *minimum*
delay, not an exact one. Seeing the real number is more instructive than the round one.

## Next

→ [Tutorial 5: Live TypeScript Evaluation in VS Code](05-live-typescript-evaluation.md)
