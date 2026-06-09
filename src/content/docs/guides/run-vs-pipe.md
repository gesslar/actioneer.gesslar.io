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
`maxConcurrent` (default `10`). Returns an array of **settled results** and
**never throws** on individual pipeline failures.

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

`pipe()` uses `Promise.allSettled()` internally, so every element of the
returned array is a settlement object:

- `{status: "fulfilled", value: <result>}` — the pipeline succeeded.
- `{status: "rejected", reason: <error>}` — the pipeline threw.

This is a deliberate design choice: **error-handling responsibility stays at the
call site.** One failing context never aborts the rest of the batch — you decide
what to do with each outcome.

## Side-by-side

| | `run(context)` | `pipe(contexts, maxConcurrent)` |
| --- | --- | --- |
| Input | One context | Array of contexts |
| Concurrency | N/A (single run) | Configurable (default `10`) |
| Return value | Final context value | Array of settled results |
| On error | **Throws** | Captured as `{status: "rejected", reason}` |
| Error handling | `try/catch` | Inspect each result's `status` |

:::tip
Need the throw-on-error ergonomics of `run()` but for a batch? Call `pipe()` and
then throw yourself after inspecting the results — e.g. fail fast if
`results.some(r => r.status === "rejected")`.
:::
