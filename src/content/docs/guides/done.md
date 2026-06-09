---
title: Finalizing with done()
description: Register a callback that runs after every activity completes — even on error — to clean up resources and shape the final result.
---

`done()` registers a callback that runs **after all activities complete**,
regardless of whether an error occurred. It behaves like a `finally` block: it
always runs, and whatever it returns becomes the pipeline's final result.

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .do("step1", ctx => { ctx.a = 1 })
      .do("step2", ctx => { ctx.b = 2 })
      .done(ctx => {
        // Runs after every activity
        return {total: ctx.a + ctx.b}
      })
  }
}

const runner = new ActionRunner(new ActionBuilder(new MyAction()))
console.log(await runner.run({})) // { total: 3 }
```

## Key behaviors

- **Always executes.** The callback runs even if an earlier activity throws —
  like `finally` in `try/catch`.
- **Top-level only (mostly).** It runs only for the outermost pipeline, not for
  [nested builders](/guides/nested-pipelines/) inside `WHILE`/`UNTIL` loops.
  The exception is [`SPLIT`](/guides/split/): because each split is an
  independent execution, `done()` runs **once per split context**.
- **Transforms the result.** Whatever you return from `done()` becomes the final
  pipeline result.
- **Bound to the action.** The callback's `this` is your action instance, so you
  can reach instance state and methods.
- **Async-friendly.** The callback may be `async` and return a `Promise`.

## Use cases

### Clean up resources

Close connections, release locks, or flush buffers no matter how the pipeline
ends:

```js
builder
  .do("openConnection", ctx => { ctx.conn = openDb() })
  .do("query", ctx => { ctx.data = ctx.conn.query("SELECT *") })
  .done(ctx => {
    ctx.conn.close() // always close, even on error
    return ctx.data
  })
```

### Transform the final result

Return just the part of the context callers care about, instead of the whole
object:

```js
builder
  .do("gather", ctx => { ctx.items = [1, 2, 3] })
  .do("process", ctx => { ctx.items = ctx.items.map(x => x * 2) })
  .done(ctx => ctx.items) // return only the items
```

### Logging and metrics

```js
builder
  .do("start", ctx => { ctx.startTime = Date.now() })
  .do("work", ctx => { /* ... */ })
  .done(ctx => {
    console.log(`Pipeline completed in ${Date.now() - ctx.startTime}ms`)
    return ctx
  })
```

:::tip[done() vs hooks]
Use `done()` for **whole-pipeline** finalization and result shaping. Use
[lifecycle hooks](/guides/hooks/) when you need to run code around **individual
activities**.
:::
