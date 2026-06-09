---
title: ActionHooks
description: API reference for ActionHooks — lifecycle hook management with optional file-based loading in Node.js.
---

`ActionHooks` manages the `before$` / `after$` lifecycle callbacks that fire
around each activity. You usually configure hooks through the builder's
[`withHooks()`](/reference/action-builder/#withhookshooks) or
[`withHooksFile()`](/reference/action-builder/#withhooksfilehooksfile-hookskind)
methods rather than constructing this class directly — but the constructor is
available when you need to tune options like the hook timeout.

```js
import {ActionHooks} from "@gesslar/actioneer"
```

:::note[Two builds]
The Node.js build exports an enhanced `ActionHooks` that supports loading hooks
from a file. The browser build supports pre-instantiated hooks only. See
[Installation](/start/installation/#explicit-variants).
:::

## Constructor

```js
new ActionHooks({actionKind, hooksFile?, hooks?, hookTimeout?, debug?})
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `actionKind` | `string` | — | Action identifier shared between runner and hooks (the exported hooks class name). |
| `hooksFile` | `FileObject` _(Node.js)_ | — | File handle used to import the hooks module. |
| `hooks` | `object` | — | A pre-instantiated hooks object. |
| `hookTimeout` | `number` | `1000` | Per-hook timeout in milliseconds. |
| `debug` | `function` | — | Logger function for diagnostics. |

```js
new ActionHooks({
  actionKind: "MyActionHooks",
  hooksFile: "./hooks.js",
  hookTimeout: 5000, // 5 seconds
  debug: console.log,
})
```

## `ActionHooks.new(config, debug)`

**Node.js only.** Static async factory that loads and instantiates a hooks class
from a file. Validates that the file exists and exports the named class, then
returns a ready `ActionHooks` instance.

```js
const hooks = await ActionHooks.new({
  actionKind: "MyActionHooks",
  hooksFile: "./hooks/MyActionHooks.js",
}, console.log)
```

Throws a `Sass` error if the hooks file does not exist or does not export the
named class.

## Hook timeout

Each hook must complete within `hookTimeout` milliseconds (default **1000ms**).
If a hook exceeds the timeout, the pipeline throws a `Sass` error. Raise the
limit via the constructor option above for legitimately slow setup/teardown
work.

## Authoring hooks

Hook classes follow the `event$activityName` naming convention, with optional
`setup` and `cleanup` methods. The full authoring guide — including the
name-normalization rules — lives in [Lifecycle Hooks](/guides/hooks/).

```js
export class MyActionHooks {
  constructor({debug}) { this.debug = debug }

  async before$prepare(context) { this.debug("before prepare", context) }
  async after$prepare(context)  { this.debug("after prepare", context) }

  async setup(args)   { /* once at init */ }
  async cleanup(args) { /* once at teardown */ }
}
```

## Nested pipelines

Hooks configured on a parent builder are automatically propagated to all nested
builders, so a single configuration covers the entire pipeline hierarchy. See
[Nested Pipelines](/guides/nested-pipelines/#inherited-behavior).

## Related

- [Lifecycle Hooks](/guides/hooks/) — the full guide with examples.
- [ActionBuilder](/reference/action-builder/) — `withHooks()` / `withHooksFile()`.
