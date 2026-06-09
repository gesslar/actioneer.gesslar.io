---
title: ActionBuilder
description: API reference for ActionBuilder — the fluent builder used to compose activities into a pipeline.
---

`ActionBuilder` is the fluent API for composing a pipeline. You add activities
with `.do()`, configure [hooks](/guides/hooks/), and register a
[`done()`](/guides/done/) finalizer, then hand the builder to an
[`ActionRunner`](/reference/action-runner/).

```js
import {ActionBuilder} from "@gesslar/actioneer"
```

## Constructor

```js
new ActionBuilder(action?, config?)
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `action` | `object` _(optional)_ | An action instance with a `setup(builder)` method. If provided, `setup()` is called immediately to populate the pipeline. |
| `config` | `object` _(optional)_ | Options: `{tag?, debug?}`. |

```js
// With an action
const builder = new ActionBuilder(new MyAction())

// Empty — add activities directly (common for nested builders)
const nested = new ActionBuilder()
```

:::caution
An action can only be consumed by **one** builder. Reusing an action instance
throws `"Action has already been consumed by a builder and cannot be reused."`
`setup` must be a function.
:::

## `do(name, ...args)`

Appends an activity to the pipeline. The arguments after `name` determine the
[mode](/guides/activity-modes/). Returns the builder for chaining.

| Overload | Mode |
| -------- | ---- |
| `.do(name, operation)` | Default — run once |
| `.do(name, ACTIVITY.WHILE, predicate, operation)` | [WHILE](/guides/activity-modes/#while) |
| `.do(name, ACTIVITY.UNTIL, predicate, operation)` | [UNTIL](/guides/activity-modes/#until) |
| `.do(name, ACTIVITY.IF, predicate, operation)` | [IF](/guides/activity-modes/#if) |
| `.do(name, ACTIVITY.BREAK, predicate)` | [BREAK](/guides/control-flow/#break--exit-the-loop) |
| `.do(name, ACTIVITY.CONTINUE, predicate)` | [CONTINUE](/guides/control-flow/#continue--skip-to-the-next-iteration) |
| `.do(name, ACTIVITY.SPLIT, splitter, rejoiner, operation)` | [SPLIT](/guides/split/) |

The `operation` may be a function `(context) => unknown` or a nested
[`ActionBuilder`](/guides/nested-pipelines/).

:::note[Names must be unique]
Each activity name must be unique within a builder. Reusing a name throws
`"Activity '<name>' has already been registered."` Names are also used to wire
up [hooks](/guides/hooks/).
:::

## `withHooks(hooks)`

Configures the pipeline with a **pre-instantiated** hooks object. Works in both
Node.js and the browser. Returns the builder.

```js
builder.withHooks(new MyActionHooks({debug: console.log}))
```

Calling `withHooks()` with the same instance again is idempotent. Configuring
hooks more than once with a different source throws
`"Hooks have already been configured."`

## `withHooksFile(hooksFile, hooksKind)`

**Node.js only.** Loads hooks from a module file when the action is built.
Returns the builder.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `hooksFile` | `string` | Path to the hooks module file. |
| `hooksKind` | `string` | Name of the exported hooks class to instantiate. |

```js
builder.withHooksFile("./hooks/MyActionHooks.js", "MyActionHooks")
```

See [Lifecycle Hooks](/guides/hooks/) for the hook authoring conventions.

## `withAction(action)`

Sets the action instance **if not already set**, propagating it to any existing
activity definitions that lack one. Primarily used to pass parent action context
to nested builders. Returns the builder.

```js
new ActionBuilder().withAction(this)
```

## `done(callback)`

Registers a finalizer that runs after every activity completes — even on error.
Whatever it returns becomes the pipeline's final result. The callback is bound to
the action instance and may be async. Returns the builder.

```js
builder.done(ctx => ({total: ctx.a + ctx.b}))
```

See [Finalizing with done()](/guides/done/) for behavior details.

## Related

- [ActionRunner](/reference/action-runner/) — executes the built pipeline.
- [Activity & ACTIVITY](/reference/activity/) — the mode flags.
- [Core Concepts](/start/concepts/) — how builders fit into the whole.
