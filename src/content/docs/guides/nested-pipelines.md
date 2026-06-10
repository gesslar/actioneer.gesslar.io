---
title: Nested Pipelines
description: Use a nested ActionBuilder as the body of a loop or parallel section to compose sub-pipelines.
---

An activity's operation doesn't have to be a single function — it can be a whole
**nested `ActionBuilder`**. Nesting is how you give loops and parallel sections a
multi-step body, and it's required for [`BREAK` and `CONTINUE`](/guides/control-flow/).

## When to nest

You reach for a nested builder whenever the body of a control-flow activity needs
more than one step:

- **Loops** — a `WHILE`/`UNTIL` body with several activities.
- **Control flow** — `BREAK`/`CONTINUE` _must_ live inside a nested builder.
- **Parallelism** — a [`SPLIT`](/guides/split/) operation that runs a
  sub-pipeline per split.

## A loop body

Here the loop body is a nested builder with three activities. `BREAK` and
`CONTINUE` operate on the enclosing `WHILE` loop:

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class Worker {
  setup(builder) {
    builder
      .do("init", ctx => { ctx.count = 0; ctx.out = []; return ctx })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 10,
        new ActionBuilder()
          .do("increment", ctx => { ctx.count++; return ctx })
          .do("skipEvens", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
          .do("collect", ctx => { ctx.out.push(ctx.count); return ctx })
      )
      .do("finish", ctx => ctx.out)
  }
}
```

:::tip[Return the context]
Inside a nested builder, have each operation `return ctx` so the updated state
flows to the next activity in the sub-pipeline.
:::

## A parallel sub-pipeline

For [`SPLIT`](/guides/split/), the operation can be a nested builder so each
parallel task runs its own sequence of steps:

```js
import {Promised} from "@gesslar/toolkit"

class NestedParallel {
  #split = ctx => ctx.batches.map(batch => ({batch}))

  #rejoin = (original, settledResults) => {
    // SPLIT rejoiners receive settlement objects — go through .value
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

Construct the nested builder **empty** (`new ActionBuilder()`). The runner
injects the parent action into it automatically, so `this` inside the nested
operations is the parent action instance. Do _not_ pass `this`
(`new ActionBuilder(this)`): an action already consumed by a builder cannot be
reused, so that throws.

## Inherited behavior

Nested builders don't run in isolation — they inherit context from their parent:

- **Hooks flow down.** A parent's [hooks](/guides/hooks/) are automatically
  passed to all nested builders, so observability is consistent throughout.
- **`done()` does not flow down — except under SPLIT.** A nested builder's
  [`done()`](/guides/done/) does not run when the builder is a `WHILE`/`UNTIL`
  loop body. The exception is a nested builder used as a `SPLIT` operation: each
  split runs as an independent execution, so its `done()` fires once per split
  context. The outer pipeline's own `done()` always runs exactly once.

## Constructing nested builders

You can build nested pipelines two ways:

```js
// Empty builder — the runner injects the parent action, so `this` inside
// these operations is the parent action instance
new ActionBuilder()
  .do("a", ctx => { /* ... */ return ctx })
  .do("b", ctx => { /* ... */ return ctx })

// Bound to a separate action instance — use its methods and `this`
new ActionBuilder(otherAction)
  .do("a", ctx => { /* ... */ return ctx })
```

Both forms are valid as the operation of a `WHILE`, `UNTIL`, or `SPLIT`
activity. Do not pass the current action with `new ActionBuilder(this)` — it has
already been consumed by the outer builder, and reusing it throws. Use the empty
form to reach the parent action's `this`, or bind a different, unconsumed action.
