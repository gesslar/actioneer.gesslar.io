---
title: Piper
description: API reference for Piper — the concurrent worker-pool base class that ActionRunner extends.
---

`Piper` is the low-level concurrency engine that
[`ActionRunner`](/reference/action-runner/) is built on. It processes items
through a series of steps with a configurable worker pool, lifecycle hooks
(`setup` / `process` / `teardown`), settled results, and abort support.

`Piper` and `ActionRunner` share a **shape** — `setup`, steps, `cleanup`, run a
batch concurrently — but they sit at opposite ends of a **simplicity ↔
flexibility tradeoff**:

- **`Piper` is simpler, and less flexible.** A pipeline is a **flat, linear list
  of step functions** that every item runs in the same order. There is no
  branching, looping, parallel fan-out, nesting, per-step hooks, or result
  shaping — just "run these functions over each item, concurrently."
- **`ActionRunner` trades that simplicity for power.** It keeps the same
  setup/steps/cleanup frame but makes each unit an *activity* with
  [modes](/guides/activity-modes/) (`WHILE`/`UNTIL`/`IF`),
  [control flow](/guides/control-flow/) (`BREAK`/`CONTINUE`),
  [parallel `SPLIT`](/guides/split/), [nested pipelines](/guides/nested-pipelines/),
  per-activity [hooks](/guides/hooks/), and a [`done()`](/guides/done/) finalizer.

So reach for `Piper` directly when a flat worker-pool over plain functions is all
you need; reach for `ActionRunner` the moment you want conditionals, loops, or
structure. Most users never touch `Piper` directly — it's exported and documented
here for that bare-worker-pool case and to explain where `ActionRunner`'s
concurrency behavior comes from.

```js
import {Piper} from "@gesslar/actioneer"
```

## What Piper provides

- **Concurrent processing** with a configurable limit (the `maxConcurrent`
  argument that surfaces on [`ActionRunner.pipe()`](/reference/action-runner/#pipecontexts-maxconcurrent)).
- **A pipeline of steps** that each item flows through.
- **Settled results** — every item resolves to a `{status: "fulfilled", value}`
  or `{status: "rejected", reason}` object (the shape `Promise.allSettled()`
  produces); one item failing never rejects the whole batch.
- **Lifecycle hooks** — `setup`, `process`, and `teardown` phases, populated by
  [`addSetup`](#addsetupfn-thisarg), [`addStep`](#addstepfn-options-thisarg),
  and [`addCleanup`](#addcleanupfn-thisarg).
- **Abort support** — emit an `"abort"` event to stop processing, with the
  reason available via the `reason` getter.

## Constructor

```js
new Piper(config?)
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `config` | `object` _(optional)_ | Options: `{debug?}` — a logger function for diagnostics. |

## Building a pipeline

A `Piper` is assembled from **process steps** plus optional **setup** and
**cleanup** hooks. All three registration methods return the instance, so they
chain. [`pipe()`](#pipeitems-maxconcurrent) then runs everything.

```text
setup(items)  ──►  for each item: step₁ → step₂ → … → stepₙ  ──►  cleanup(items)
   once                    (concurrent across items)                  once
```

### `addStep(fn, options?, thisArg?)`

Registers a processing step. Each item flows through every step **in the order
the steps were added**, once per item.

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `fn` | `(context) => unknown \| Promise<unknown>` | — | Processes one item. |
| `options` | `object` _(optional)_ | `{}` | `{name?, required?}` — see below. Any extra keys are stored on the step descriptor. |
| `thisArg` | `unknown` _(optional)_ | the Piper | `this` binding for `fn`. |

- **Return value chains.** A step's return becomes the next step's input. If a
  step returns `null`/`undefined`, the **previous** value is carried forward
  (`result = await fn(result) ?? result`) — so a step may mutate-and-return-void
  and the item still flows on.
- **`options.name`** — label used in diagnostics. Defaults to `Step N`.
- **`options.required`** — defaults to `true`. A **required** step that throws
  rejects _that item_ (its result becomes `{status: "rejected", reason}`); other
  items keep going. A **non-required** step that throws is **silently swallowed**
  and the item continues with the value from before the step.
- Returning an `Error` instance (rather than throwing) also marks the item
  rejected.

### `addSetup(fn, thisArg?)`

Registers a hook that runs **once before any item is processed**.

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `fn` | `(items) => void \| Promise<void>` | — | Receives the **full items array**. Use it to open resources or validate the batch. |
| `thisArg` | `unknown` _(optional)_ | the Piper | `this` binding for `fn`. |

If a setup hook throws or rejects, `pipe()` **aborts before processing any
item**.

### `addCleanup(fn, thisArg?)`

Registers a hook that runs **once after all items finish** — in a `finally`, so
it runs even if processing failed.

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `fn` | `(items) => void \| Promise<void>` | — | Receives the **full items array**. Use it to close resources opened in `addSetup`. |
| `thisArg` | `unknown` _(optional)_ | the Piper | `this` binding for `fn`. |

If a cleanup hook throws or rejects, `pipe()` aborts with the failure.

### Example

```js
import {Piper} from "@gesslar/actioneer"

const results = await new Piper()
  .addSetup(items => console.log(`processing ${items.length} items`))
  .addStep(n => n + 1, {name: "increment"})
  .addStep(n => n * 10, {name: "scale"})
  .addCleanup(() => console.log("done"))
  .pipe([5, 7])

// processing 2 items
// done
results.map(r => r.value) // [60, 80]
```

## `pipe(items, maxConcurrent?)`

Processes `items` through the pipeline's steps with concurrency control.

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `items` | `Array<unknown>` | — | Items to process. |
| `maxConcurrent` | `number` | `10` | Maximum number of items processed concurrently. |

The worker pool size is `Math.min(maxConcurrent, items.length)`.
[`ActionRunner`](/reference/action-runner/) inherits this method — its public
`pipe()` is `Piper.pipe()` applied to your pipeline contexts.

## Relationship to ActionRunner

```text
  Piper                 (concurrent worker pool, lifecycle, abort)
    └── extends ──► ActionRunner   (run / pipe over an ActionBuilder pipeline)
```

`ActionRunner` is the flexible end of the tradeoff above, and it gets there by
wiring *itself* into Piper's simple primitives: it registers a **single process
step** (its `run` over your whole [`ActionBuilder`](/reference/action-builder/)
pipeline) via `addStep`, plus an `addSetup`/`addCleanup` pair that invoke your
[hooks](/guides/hooks/)' `setup`/`cleanup`. All of `ActionRunner`'s richness —
modes, loops, control flow, `SPLIT` — lives *inside* that one step. (It's also
why `setup`/`cleanup` hooks fire once per [`pipe()`](/guides/run-vs-pipe/) batch:
they *are* Piper setup and teardown steps.)

For day-to-day pipeline building, use [`ActionRunner`](/reference/action-runner/)
and [`ActionBuilder`](/reference/action-builder/); reach for `Piper` directly
only when you need a bare worker-pool over arbitrary step functions.

## Related

- [ActionRunner](/reference/action-runner/) — the activity-aware subclass.
- [run() vs pipe()](/guides/run-vs-pipe/) — how concurrency surfaces to you.
