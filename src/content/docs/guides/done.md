---
title: Finalizing with done()
description: Register a callback that runs after every activity completes — even on error — to clean up resources and shape the final result.
---

`done()` registers a callback that runs **after all activities complete, whether
or not an error occurred** — like a `finally` block. On success it receives the
final context, and **whatever it returns becomes the pipeline's result**. On
failure it receives the **thrown error** instead, and the pipeline still rejects
with that error: `done()` runs for its side effects but cannot replace or swallow
the failure — its return value is ignored on the error path.

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .do("step1", ctx => { ctx.a = 1; return ctx })
      .do("step2", ctx => { ctx.b = 2; return ctx })
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
- **Receives the outcome.** On success the argument is the final context; on
  error it is the thrown `Error`. Branch on `arg instanceof Error` if you need to
  tell them apart. (Because of this, a resource you must release even on error
  should live on the action instance — see below — not only on the context.)
- **Top-level only (mostly).** A pipeline's own `done()` runs once. A
  [nested builder](/guides/nested-pipelines/)'s `done()` does _not_ run when it
  is used inside `WHILE`/`UNTIL` loops. The exception is
  [`SPLIT`](/guides/split/): a nested builder used as the SPLIT operation runs as
  an independent execution, so its `done()` fires **once per split context**.
- **Transforms the result — on success.** Whatever you return becomes the final
  result when the pipeline succeeded. On error the original error is re-thrown and
  your return value is discarded.
- **Bound to the action.** The callback's `this` is your action instance, so you
  can reach instance state and methods — on both the success and error paths.
- **Async-friendly.** The callback may be `async` and return a `Promise`.

## Use cases

### Clean up resources

Close connections, release locks, or flush buffers no matter how the pipeline
ends. Keep the resource on the **action instance** (`this`), not only on the
context — on the error path `done()` is handed the error rather than the context,
but `this` still points at your action either way:

```js
class Worker {
  setup(builder) {
    builder
      .do("open", ctx => { this.conn = openDb(); return ctx })
      .do("query", ctx => { ctx.data = this.conn.query("SELECT *"); return ctx })
      .done(function(outcome) {
        this.conn?.close() // always closes — `this` is the action on success and error alike

        if(!(outcome instanceof Error))
          return outcome.data // shape the result on success; on error the runner re-throws
      })
  }
}
```

For batch lifecycles, the [`cleanup` hook](/guides/hooks/) is another option — it
runs once after a `pipe()` completes.

### Transform the final result

Return just the part of the context callers care about, instead of the whole
object:

```js
builder
  .do("gather", ctx => { ctx.items = [1, 2, 3]; return ctx })
  .do("process", ctx => { ctx.items = ctx.items.map(x => x * 2); return ctx })
  .done(ctx => ctx.items) // return only the items
```

### Logging and metrics

```js
builder
  .do("start", ctx => { ctx.startTime = Date.now(); return ctx })
  .do("work", ctx => { /* ... */ return ctx })
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
