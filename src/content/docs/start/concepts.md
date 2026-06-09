---
title: Core Concepts
description: The mental model behind Actioneer — actions, builders, contexts, activities, runners, and hooks.
---

Actioneer has a small vocabulary. Once these five terms click, the rest of the
API follows naturally.

## Action

An **action** is your code: any object that exposes a `setup(builder)` method.
Inside `setup`, you describe the pipeline by chaining calls on the builder. The
action instance is also the `this` for `done()` callbacks, so you can keep
predicates and operations as private methods on the class.

```js
class MyAction {
  #isReady = ctx => ctx.ready === true

  setup(builder) {
    builder
      .do("load", ctx => { ctx.ready = true })
      .do("guard", ACTIVITY.IF, this.#isReady, ctx => { /* ... */ })
  }
}
```

You don't _have_ to pass an action — an empty `new ActionBuilder()` works too,
and is common for the [nested builders](/guides/nested-pipelines/) used inside
loops.

## ActionBuilder

The **builder** is the fluent API you compose pipelines with. Its core method is
`.do()`, which appends an activity. It also carries configuration helpers like
[`withHooks()`](/guides/hooks/), `withHooksFile()`, and
[`done()`](/guides/done/).

```js
const builder = new ActionBuilder(new MyAction())
```

Constructing a builder with an action immediately calls that action's `setup()`,
so the pipeline is fully described by the time the constructor returns.

See the [ActionBuilder reference](/reference/action-builder/) for every method.

## Context

The **context** is a plain object threaded through every activity. It is your
pipeline's shared state. Operations read from it and mutate it in place; the
final value returned (or the value `ctx` holds) is what the runner gives back.

```js
builder
  .do("a", ctx => { ctx.x = 1 })       // write
  .do("b", ctx => { ctx.y = ctx.x + 1 }) // read + write
  .do("c", ctx => ctx.y)                 // return the result
```

Each invocation of the pipeline gets its own context. When you call
`pipe([c1, c2, c3])`, each of those objects flows through an independent run.

## Activity

An **activity** is one named step in the pipeline, created by `.do(name, ...)`.
Every activity has a **name** (used for [hook](/guides/hooks/) wiring) and an
**operation**. Beyond the default "run once" behavior, activities can take a
**mode** that changes how the operation executes:

| Mode | Behavior |
| ---- | -------- |
| Default | Run the operation once |
| `WHILE` | Loop while a predicate is true (checked before each pass) |
| `UNTIL` | Loop until a predicate is true (checked after each pass) |
| `IF` | Run once only if a predicate is true |
| `BREAK` | Exit the enclosing loop |
| `CONTINUE` | Skip to the next loop iteration |
| `SPLIT` | Fan out into parallel sub-runs, then rejoin |

Modes are covered in depth in [Activity Modes](/guides/activity-modes/) and
[Control Flow](/guides/control-flow/).

## ActionRunner

The **runner** executes a built pipeline. It offers two methods:

- **`run(context)`** — execute once, return the final value, throw on error.
- **`pipe(contexts, maxConcurrent)`** — execute concurrently across many
  contexts, returning settled results (never throws on individual failures).

```js
const runner = new ActionRunner(builder)
await runner.run({})            // single
await runner.pipe([{}, {}], 4)  // batch, max 4 at a time
```

See [run() vs pipe()](/guides/run-vs-pipe/) for guidance on choosing between
them.

## Hooks

**Hooks** are optional lifecycle callbacks that fire `before$` and `after$` each
activity, matched by activity name. They're handy for logging, metrics, setup,
and cleanup, and are configured on the builder with `withHooks()` or (in
Node.js) `withHooksFile()`. See [Lifecycle Hooks](/guides/hooks/).

## How it fits together

```
  Action.setup(builder)
        │  describes
        ▼
  ActionBuilder ──── activities (.do) ──── optional hooks (.withHooks)
        │  handed to
        ▼
  ActionRunner ──── run(ctx)  ──► final value (throws on error)
                └─ pipe(ctxs) ──► settled results (concurrent)
```

With the vocabulary in place, explore the [guides](/guides/activity-modes/) to
see each piece in action.
