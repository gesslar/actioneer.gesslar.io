---
title: Piper
description: API reference for Piper — the concurrent worker-pool base class that ActionRunner extends.
---

`Piper` is the low-level concurrency engine that
[`ActionRunner`](/reference/action-runner/) is built on. It processes items
through a series of steps with a configurable worker pool, lifecycle hooks
(`setup` / `process` / `teardown`), result categorization, and abort support.

Most users never touch `Piper` directly — you work through `ActionRunner`. It's
exported and documented here for advanced use and to explain where
`ActionRunner`'s concurrency behavior comes from.

```js
import {Piper} from "@gesslar/actioneer"
```

## What Piper provides

- **Concurrent processing** with a configurable limit (the `maxConcurrent`
  argument that surfaces on [`ActionRunner.pipe()`](/reference/action-runner/#pipecontexts-maxconcurrent)).
- **A pipeline of steps** that each item flows through.
- **Result categorization** — success, warning, and error outcomes.
- **Lifecycle hooks** — `setup`, `process`, and `teardown` phases.
- **Abort support** — emit an `"abort"` event to stop processing, with the
  reason available via the `reason` getter.

## Constructor

```js
new Piper(config?)
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `config` | `object` _(optional)_ | Options: `{debug?}` — a logger function for diagnostics. |

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

```
  Piper                 (concurrent worker pool, lifecycle, abort)
    └── extends ──► ActionRunner   (run / pipe over an ActionBuilder pipeline)
```

`ActionRunner` adds the activity-aware execution model — modes, loops,
control flow, and `SPLIT` — on top of Piper's concurrency primitives. For
day-to-day pipeline building, use [`ActionRunner`](/reference/action-runner/)
and [`ActionBuilder`](/reference/action-builder/); reach for `Piper` directly
only when you need a bare worker-pool over arbitrary step functions.

## Related

- [ActionRunner](/reference/action-runner/) — the activity-aware subclass.
- [run() vs pipe()](/guides/run-vs-pipe/) — how concurrency surfaces to you.
