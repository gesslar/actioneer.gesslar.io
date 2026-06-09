---
title: Parallelism with SPLIT
description: Use SPLIT mode to fan a context out into parallel sub-runs and rejoin the settled results.
---

`SPLIT` mode executes a split/rejoin pattern for parallel work. You provide a
**splitter** that divides the context into many, an **operation** that runs on
each split in parallel, and a **rejoiner** that recombines the results.

```js
.do(name, ACTIVITY.SPLIT, splitter, rejoiner, operation)
```

## A complete example

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class ParallelProcessor {
  #split = ctx => {
    // Split the context into one item per parallel task
    return ctx.items.map(item => ({item, processedBy: "worker"}))
  }

  #rejoin = (originalCtx, splitResults) => {
    // Recombine parallel results back into the original context
    originalCtx.results = splitResults.map(r => r.item)
    return originalCtx
  }

  #processItem = ctx => {
    ctx.item = ctx.item.toUpperCase()
  }

  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.items = ["apple", "banana", "cherry"]
      })
      .do("parallel", ACTIVITY.SPLIT, this.#split, this.#rejoin, this.#processItem)
      .do("finish", ctx => { return ctx.results })
  }
}
```

## How SPLIT works

1. The **splitter** receives the context and returns an **array of contexts** —
   one per parallel task.
2. Each split context is processed in parallel through the **operation**.
3. The **rejoiner** receives the original context and the array of **settled
   results** from `Promise.allSettled()`.
4. The rejoiner combines the results and returns the updated context.

## SPLIT uses `Promise.allSettled()`

This is the part to internalize: your **rejoiner receives settlement objects**,
not raw values. Each element of the array is one of:

- `{status: "fulfilled", value: <result>}` for a successful operation
- `{status: "rejected", reason: <error>}` for a failed operation

Your rejoiner must handle them accordingly — check each `status` manually, or
lean on helpers from [`@gesslar/toolkit`](https://github.com/gesslar/toolkit):

```js
import {Util} from "@gesslar/toolkit"

#rejoin = (originalCtx, settledResults) => {
  // settledResults is an array of settlement objects.

  // Keep only the successful results
  originalCtx.results = Util.fulfilledValues(settledResults)

  // Collect any failures
  if (Util.anyRejected(settledResults)) {
    originalCtx.errors = Util.rejectedReasons(
      Util.settledAndRejected(settledResults)
    )
  }

  return originalCtx
}
```

:::caution
A naive rejoiner that does `splitResults.map(r => r.someField)` will read fields
off settlement wrappers, not your values. Always go through `.value` (or a
toolkit helper) unless your operation is guaranteed not to reject.
:::

## Nested pipelines with SPLIT

The operation can itself be a [nested `ActionBuilder`](/guides/nested-pipelines/),
letting each parallel task run a whole sub-pipeline:

```js
class NestedParallel {
  #split = ctx => ctx.batches.map(batch => ({batch}))

  #rejoin = (original, results) => {
    original.processed = results.flatMap(r => r.batch)
    return original
  }

  setup(builder) {
    builder
      .do("parallel", ACTIVITY.SPLIT, this.#split, this.#rejoin,
        new ActionBuilder(this)
          .do("step1", ctx => { /* ... */ })
          .do("step2", ctx => { /* ... */ })
      )
  }
}
```

## SPLIT and done()

Unlike loop bodies, a SPLIT runs each split context as an **independent
execution** — so a top-level [`done()`](/guides/done/) callback runs **once per
split**, not just once for the outer pipeline. Keep that in mind if your `done()`
has side effects.

## Requirements

- **Both functions are mandatory.** SPLIT requires a splitter _and_ a rejoiner;
  omitting either throws.
- **The splitter returns an array.** Each element becomes the context for one
  parallel operation.
- **The rejoiner returns the context.** Whatever it returns flows to the next
  activity.
