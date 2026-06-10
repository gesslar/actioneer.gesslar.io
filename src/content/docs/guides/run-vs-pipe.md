---
title: run() vs pipe()
description: Choose between single-context execution with run() and concurrent batch execution with pipe().
---

`ActionRunner` gives you two ways to execute a pipeline. The right choice
depends on whether you're processing **one** context or **many**, and how you
want errors handled.

## `run(context)` — single execution

Executes the pipeline once with a single context. Returns the final context
value directly, and **throws** if any activity errors.

```js
const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)

try {
  const result = await runner.run({input: "data"})
  console.log(result) // final context value
} catch (error) {
  console.error("Pipeline failed:", error)
}
```

**Reach for `run()` when:**

- You're processing a single context.
- You want errors to throw immediately.
- You prefer traditional `try/catch` error handling.

## `pipe(contexts, maxConcurrent)` — concurrent batch

Executes the pipeline concurrently across an array of contexts, capped at
`maxConcurrent` (default `10`). Returns an array of **settled results**; an
individual context failing is captured as a result rather than thrown. (A
batch-level failure — a [`setup`/`cleanup` hook](/guides/hooks/) throwing — still
throws; see [Lifecycle differences](#lifecycle-differences) below.)

```js
const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)

const contexts = [{id: 1}, {id: 2}, {id: 3}]
const results = await runner.pipe(contexts, 4) // up to 4 concurrent

results.forEach((result, i) => {
  if (result.status === "fulfilled") {
    console.log(`Context ${i} succeeded:`, result.value)
  } else {
    console.error(`Context ${i} failed:`, result.reason)
  }
})
```

**Reach for `pipe()` when:**

- You're processing multiple contexts in parallel.
- You want to control concurrency.
- You need _all_ results — successes and failures alike.
- Error handling belongs at the call site, not inside the framework.

## Settled results

`pipe()` returns results in the same shape `Promise.allSettled()` produces — a
concurrent worker pool captures each context's outcome, so every element of the
returned array is a settlement object:

- `{status: "fulfilled", value: <result>}` — the pipeline succeeded.
- `{status: "rejected", reason: <error>}` — the pipeline threw.

This is a deliberate design choice: **error-handling responsibility stays at the
call site.** One failing context never aborts the rest of the batch — you decide
what to do with each outcome.

## Lifecycle differences

The two entry points don't just differ in error handling — they run different
lifecycles:

- **`setup`/`cleanup` hooks are `pipe()`-only.** The
  [`setup` and `cleanup`](/guides/hooks/) lifecycle hooks belong to the **batch**:
  they run once before and once after a `pipe()` call. A bare `run()` does **not**
  invoke them. If a hook depends on `setup` to open a resource, drive the runner
  with `pipe()` — pass a single-element array (`pipe([ctx])`) for one item.
- **`before$`/`after$` hooks fire under both.** Per-activity hooks run for every
  activity regardless of which entry point you use.
- **`pipe()` runs each context through `run()` internally.** So whatever is true
  of a single `run()` — including that [`done()`](/guides/done/) runs once per
  execution — happens **once per context** under `pipe()`.

:::caution[`setup` won't fire under `run()`]
Resource acquisition placed in a `setup` hook silently does nothing under a bare
`run()`. Use `pipe([ctx])` when you rely on `setup`/`cleanup`.
:::

## Side-by-side

| | `run(context)` | `pipe(contexts, maxConcurrent)` |
| --- | --- | --- |
| Input | One context | Array of contexts |
| Concurrency | N/A (single run) | Configurable (default `10`) |
| Return value | Final context value | Array of settled results |
| On a context's error | **Throws** | Captured as `{status: "rejected", reason}` |
| On a `setup`/`cleanup` failure | N/A (not invoked) | **Throws** (aborts the batch) |
| `setup`/`cleanup` hooks | Not invoked | Run once per batch |
| `before$`/`after$` hooks | Run | Run |
| `done()` | Once | Once per context |
| Error handling | `try/catch` | Inspect each result's `status` |

:::tip
Need the throw-on-error ergonomics of `run()` but for a batch? Call `pipe()` and
then throw yourself after inspecting the results — e.g. fail fast if
`results.some(r => r.status === "rejected")`.
:::
