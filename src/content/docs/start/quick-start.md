---
title: Quick Start
description: Build and run your first Actioneer pipeline in a few lines of code.
---

This page walks you from zero to a running pipeline. If you haven't installed
Actioneer yet, see [Installation](/start/installation/).

## 1. Define an action

An **action** is any object with a `setup(builder)` method. Inside `setup`, you
describe your pipeline by chaining `.do()` calls on the builder. Each step is an
**activity** that receives a shared **context** object.

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
      .do("finalise", ctx => { return ctx.count })
  }
}
```

The operation for each activity reads from and mutates `ctx`. Whatever the final
activity returns becomes the pipeline's result.

## 2. Build and run it

Wrap your action in an `ActionBuilder`, hand it to an `ActionRunner`, and call
`run()` with an initial context:

```js
const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)

const result = await runner.run({})
console.log(result) // 1
```

`run()` executes the pipeline once and returns the final context value. If any
activity throws, `run()` rejects — wrap it in `try/catch` to handle errors.

## 3. Run a batch concurrently

To process many inputs at once, use `pipe()` with an array of contexts and a
concurrency limit:

```js
const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)

// Run up to 4 contexts concurrently
const results = await runner.pipe([{}, {}, {}], 4)

// pipe() returns SETTLED results — it never throws on individual failures
results.forEach(result => {
  if (result.status === "fulfilled") {
    console.log("Count:", result.value)
  } else {
    console.error("Error:", result.reason)
  }
})
```

Unlike `run()`, `pipe()` returns an array of settlement objects
(`{status: "fulfilled", value}` or `{status: "rejected", reason}`), so a single
failing context never blows up the whole batch. See
[run() vs pipe()](/guides/run-vs-pipe/) for the full comparison.

## 4. Add a finalizer

The `done()` callback runs after every activity completes — even on error — much
like `finally`. Whatever it returns becomes the final result, which makes it
ideal for cleanup or shaping output:

```js
class MyAction {
  setup(builder) {
    builder
      .do("step1", ctx => { ctx.a = 1 })
      .do("step2", ctx => { ctx.b = 2 })
      .done(ctx => ({total: ctx.a + ctx.b}))
  }
}

const runner = new ActionRunner(new ActionBuilder(new MyAction()))
console.log(await runner.run({})) // { total: 3 }
```

See [Finalizing with done()](/guides/done/) for the details.

## Where to go next

- **[Core Concepts](/start/concepts/)** — the mental model behind actions,
  contexts, and activities.
- **[Activity Modes](/guides/activity-modes/)** — loops, conditionals, and
  parallel sections with `WHILE`, `UNTIL`, `IF`, `BREAK`, `CONTINUE`, and
  `SPLIT`.
- **[Lifecycle Hooks](/guides/hooks/)** — run code before and after activities.
