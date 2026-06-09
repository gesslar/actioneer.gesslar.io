---
title: Lifecycle Hooks
description: Run code before and after each activity with ActionHooks — by file path in Node.js, or with a pre-instantiated object anywhere.
---

Hooks let you run code **before and after each activity** in your pipeline.
They're ideal for logging, metrics, setup, and cleanup — observability that
lives alongside, but separate from, your pipeline logic.

## What hooks can do

- Execute code before and after each activity.
- Implement setup and teardown logic.
- Add observability and logging.
- Inspect (or modify) the context flowing through activities.

## Configuring hooks

There are two ways to attach hooks, depending on your environment.

### Pre-instantiated hooks (Node.js and browser)

Pass a hooks instance to `withHooks()`. This works everywhere:

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyActionHooks {
  constructor({debug}) {
    this.debug = debug
  }

  async before$prepare(context) {
    this.debug("About to prepare", context)
  }

  async after$prepare(context) {
    this.debug("Finished preparing", context)
  }
}

const hooks = new MyActionHooks({debug: console.log})

class MyAction {
  setup(builder) {
    builder
      .withHooks(hooks)
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
  }
}

const runner = new ActionRunner(new ActionBuilder(new MyAction()))
await runner.pipe([{}], 4)
```

### File-based hooks (Node.js only)

In Node.js you can load hooks from a module by path with `withHooksFile()`,
passing the file and the exported class name:

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .withHooksFile("./hooks/MyActionHooks.js", "MyActionHooks")
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
  }
}

const runner = new ActionRunner(new ActionBuilder(new MyAction()))
await runner.pipe([{}], 4)
```

:::note[Browser environments]
The browser build has no filesystem access, so `withHooksFile()` is unavailable.
Use `withHooks()` with a pre-instantiated object instead.
:::

## Writing hooks

A hooks class exposes methods named with the convention `event$activityName`,
where `event` is `before` or `after`. Optional `setup` and `cleanup` methods run
once at initialization and teardown.

```js
// hooks/MyActionHooks.js
export class MyActionHooks {
  constructor({debug}) {
    this.debug = debug
  }

  // Runs before the "prepare" activity
  async before$prepare(context) {
    this.debug("About to prepare", context)
  }

  // Runs after the "prepare" activity
  async after$prepare(context) {
    this.debug("Finished preparing", context)
  }

  async before$work(context) {
    this.debug("Starting work", context)
  }

  async after$work(context) {
    this.debug("Work complete", context)
  }

  // Optional: runs once at initialization
  async setup(args) {
    this.debug("Hooks initialized")
  }

  // Optional: runs once at teardown
  async cleanup(args) {
    this.debug("Hooks cleaned up")
  }
}
```

## Hook naming convention

Activity names are normalized into method names: spaces are removed and words
camelCased, and non-word characters are stripped. The first word stays
lowercase.

| Activity name | Hook methods |
| ------------- | ------------ |
| `"do work"` | `before$doWork` / `after$doWork` |
| `"step-1"` | `before$step1` / `after$step1` |
| `"Prepare Data"` | `before$prepareData` / `after$prepareData` |

Only the hooks you define run — there's no requirement to cover every activity.

## Hook timeout

By default, each hook has a **1-second (1000ms) timeout**. If a hook exceeds it,
the pipeline throws a `Sass` error. Configure the timeout when constructing
`ActionHooks` directly:

```js
import {ActionHooks} from "@gesslar/actioneer"

new ActionHooks({
  actionKind: "MyActionHooks",
  hooksFile: "./hooks.js",
  hookTimeout: 5000, // 5 seconds
  debug: console.log,
})
```

## Hooks and nested pipelines

When you nest builders (for [loops](/guides/control-flow/) or
[parallel sections](/guides/split/)), the parent's hooks are **automatically
passed to all children**. Hook behavior stays consistent throughout the entire
pipeline hierarchy — you configure them once at the top.

See the [ActionHooks reference](/reference/action-hooks/) for the full
constructor options.
