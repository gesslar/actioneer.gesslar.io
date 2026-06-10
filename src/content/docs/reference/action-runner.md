---
title: ActionRunner
description: API reference for ActionRunner — executes a built pipeline once with run() or concurrently with pipe().
---

`ActionRunner` executes a pipeline produced by an
[`ActionBuilder`](/reference/action-builder/). It extends
[`Piper`](/reference/piper/) and supports all activity kinds — once-off work,
`WHILE`/`UNTIL` loops, `IF` branches, `SPLIT` parallelism, and `BREAK`/`CONTINUE`
control flow.

```js
import {ActionRunner} from "@gesslar/actioneer"
```

## Constructor

```js
new ActionRunner(actionBuilder, config?)
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `actionBuilder` | `ActionBuilder` | The builder whose pipeline to execute. |
| `config` | `object` _(optional)_ | Options: `{debug?}` — a logger function for diagnostics. |

```js
const runner = new ActionRunner(new ActionBuilder(new MyAction()))
```

The argument must be an `ActionBuilder` instance. The pipeline is built (and
cached) on the first `run()`/`pipe()` call.

## `run(context)`

Executes the pipeline **once** with a single context. Returns the final context
value. **Throws** if any activity errors.

```js
const result = await runner.run({input: "data"})
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `context` | `unknown` | Seed value passed to the first activity. |

**Returns:** `Promise<unknown>` — the final value produced by the pipeline.

**Throws:**

- `Sass` — when an activity errors, or for invalid pipeline usage such as
  `BREAK`/`CONTINUE` outside a loop or a `SPLIT` missing its splitter/rejoiner.
  (An empty pipeline does not throw — it returns the seed context unchanged.)
- `Tantrum` — when both an activity and the `done()` callback fail.

Use `run()` for single contexts and traditional `try/catch` error handling. See
[run() vs pipe()](/guides/run-vs-pipe/).

## `pipe(contexts, maxConcurrent?)`

Executes the pipeline **concurrently** across an array of contexts, capped at
`maxConcurrent`. Returns an array of **settled results** and never throws on
individual failures.

```js
const results = await runner.pipe([{id: 1}, {id: 2}], 4)
```

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `contexts` | `Array<unknown>` | — | One context per pipeline execution. |
| `maxConcurrent` | `number` | `10` | Maximum number of contexts processed concurrently. |

**Returns:** `Promise<Array<SettledResult>>` where each element is:

- `{status: "fulfilled", value: <result>}` — the execution succeeded.
- `{status: "rejected", reason: <error>}` — the execution threw.

```js
results.forEach((result, i) => {
  if (result.status === "fulfilled") {
    console.log(`Context ${i} ok:`, result.value)
  } else {
    console.error(`Context ${i} failed:`, result.reason)
  }
})
```

Because `pipe()` uses `Promise.allSettled()` internally, one failing context
never aborts the batch — error handling stays at the call site. See
[run() vs pipe()](/guides/run-vs-pipe/).

## Related

- [ActionBuilder](/reference/action-builder/) — composes the pipeline.
- [Piper](/reference/piper/) — the concurrent base class.
- [Lifecycle Hooks](/guides/hooks/) — observability around activities.
