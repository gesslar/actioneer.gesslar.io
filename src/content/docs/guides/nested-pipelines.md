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
      .do("init", ctx => { ctx.count = 0; ctx.out = [] })
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

Passing `this` to the nested `ActionBuilder` (`new ActionBuilder(this)`) lets the
sub-pipeline share the parent action instance.

## Inherited behavior

Nested builders don't run in isolation — they inherit context from their parent:

- **Hooks flow down.** A parent's [hooks](/guides/hooks/) are automatically
  passed to all nested builders, so observability is consistent throughout.
- **`done()` does not flow down.** A top-level [`done()`](/guides/done/) callback
  runs only for the outermost pipeline (loops), or once per split (SPLIT) — not
  for nested loop bodies.

## Constructing nested builders

You can build nested pipelines two ways:

```js
// Empty builder — add activities directly
new ActionBuilder()
  .do("a", ctx => { /* ... */ return ctx })
  .do("b", ctx => { /* ... */ return ctx })

// Bound to an action instance — share methods and `this`
new ActionBuilder(this)
  .do("a", ctx => { /* ... */ return ctx })
```

Both forms are valid as the operation of a `WHILE`, `UNTIL`, or `SPLIT`
activity.
