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
    // Split the context into one context per parallel task
    return ctx.items.map(item => ({item, processedBy: "worker"}))
  }

  #rejoin = (originalCtx, settledResults) => {
    // settledResults are settlement objects — pull the value out of each
    originalCtx.results = settledResults
      .filter(r => r.status === "fulfilled")
      .map(r => r.value.item)

    return originalCtx
  }

  #processItem = ctx => {
    ctx.item = ctx.item.toUpperCase()

    return ctx // operations must return the context they want to pass on
  }

  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.items = ["apple", "banana", "cherry"]

        return ctx
      })
      .do("parallel", ACTIVITY.SPLIT, this.#split, this.#rejoin, this.#processItem)
      .do("finish", ctx => { return ctx.results })
  }
}
```

:::note
Every operation returns the context it wants to hand to the next step. A step
that only mutates and returns nothing passes `undefined` forward — the next
activity (here, the splitter) would then receive `undefined` instead of your
context. Always `return ctx` (or whatever value the next step expects).
:::

## How SPLIT works

1. The **splitter** receives the context and returns an **array of contexts** —
   one per parallel task. (The splitter returns the array directly; it is not
   subject to the "return the context" rule that operations follow.)
2. Each split context is processed in parallel through the **operation**. The
   value an operation returns becomes that split's settled `value`.
3. The **rejoiner** receives the **original** (pre-split) context and an array of
   **settlement objects** — the same shape `Promise.allSettled()` produces.
4. The rejoiner combines the results and returns the context that flows to the
   next activity.

## SPLIT settles every operation

This is the part to internalize: your **rejoiner receives settlement objects**,
not raw values — whether the operation is a plain function or a nested
`ActionBuilder`. Each element of the array is one of:

- `{status: "fulfilled", value: <result>}` for a successful operation
- `{status: "rejected", reason: <error>}` for a failed operation

Your rejoiner must handle them accordingly — check each `status` manually, or
lean on the `Promised` helpers from
[`@gesslar/toolkit`](https://github.com/gesslar/toolkit), which are built for
exactly this shape of data:

```js
import {Promised} from "@gesslar/toolkit"

#rejoin = (originalCtx, settledResults) => {
  // settledResults is an array of settlement objects.

  // Keep only the successful values
  originalCtx.results = Promised.values(settledResults)

  // Collect any failures
  if (Promised.hasRejected(settledResults)) {
    originalCtx.errors = Promised.reasons(settledResults)
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

  #rejoin = (original, settledResults) => {
    // A nested ActionBuilder still settles — go through .value
    original.processed = Promised.values(settledResults).flatMap(r => r.batch)
    return original
  }

  setup(builder) {
    builder
      .do("parallel", ACTIVITY.SPLIT, this.#split, this.#rejoin,
        new ActionBuilder()
          .do("step1", ctx => { /* ... */ return ctx })
          .do("step2", ctx => { /* ... */ return ctx })
      )
  }
}
```

:::note
Construct the nested builder **empty** (`new ActionBuilder()`). The runner
injects the parent action automatically, so `this` inside the nested operations
is the same action instance. Do _not_ pass `this`
(`new ActionBuilder(this)`) — an action already handed to a builder cannot be
reused, and that throws.
:::

## SPLIT and done()

Each split context runs as an **independent execution**, which changes how
[`done()`](/guides/done/) callbacks fire — but only for a nested-builder
operation. There are three cases to keep straight:

- **The outer pipeline's `done()` runs once.** The SPLIT is a single activity in
  that pipeline, so its `done()` fires exactly once, after the rejoiner — not
  per split.
- **A nested `ActionBuilder` operation's own `done()` runs once per split.**
  Because each split is executed as its own top-level run, the nested builder's
  `done()` is _not_ suppressed (this is the opposite of `WHILE`/`UNTIL` loops,
  where a nested builder's `done()` never runs). If that `done()` has side
  effects — closing a connection, writing a file — it happens once for every
  split context.
- **A plain-function operation has no `done()` of its own,** so there is nothing
  extra to fire.

Keep the second case in mind when a nested split-operation pipeline finalizes
resources in its `done()`.

## Requirements

- **Both functions are mandatory.** SPLIT requires a splitter _and_ a rejoiner;
  omitting either throws.
- **The splitter returns an array.** Each element becomes the context for one
  parallel operation.
- **The rejoiner returns the context.** Whatever it returns flows to the next
  activity.
