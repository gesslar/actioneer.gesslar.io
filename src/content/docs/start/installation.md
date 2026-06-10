---
title: Installation
description: Install Actioneer from npm or import it directly from a CDN in the browser.
---

Actioneer is published to npm as **`@gesslar/actioneer`**. It ships as pure ES
modules with TypeScript declarations and has no build step.

:::note[Requirements]
The Node.js variant targets **Node 24+**. The browser variant runs in any
modern browser and browser-like runtime (Tauri, Electron, Deno).
:::

## Node.js

Install from npm:

```bash
npm install @gesslar/actioneer
```

Then import the auto-detected build (recommended):

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"
```

### Explicit variants

The package exposes `node` and `browser` entrypoints if you want to pin one
explicitly:

```js
// Node.js build — includes file-based hook loading via withHooksFile()
import {ActionBuilder, ActionRunner, ActionHooks} from "@gesslar/actioneer/node"

// Browser build — fully functional in Node.js, but no file-based hooks
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer/browser"
```

:::tip
The browser build works fine in Node.js — it simply lacks file-based hook
loading. Use [`withHooks()`](/guides/hooks/) with a pre-instantiated hooks
object instead of `withHooksFile()`.
:::

## Browser

No install required — import directly from a CDN.

### jsDelivr (runtime only)

```html
<script type="module">
  import {ActionBuilder, ActionRunner} from "https://cdn.jsdelivr.net/npm/@gesslar/actioneer"
</script>
```

### esm.sh (runtime with types)

```js
import {ActionBuilder, ActionRunner} from "https://esm.sh/@gesslar/actioneer"
```

esm.sh can also serve the `.d.ts` for editor support:

```
https://esm.sh/@gesslar/actioneer?dts
```

### Full browser example

```html
<script type="module">
  import {ActionBuilder, ActionRunner} from "https://esm.sh/@gesslar/actioneer"

  class MyAction {
    setup(builder) {
      builder
        .do("step1", ctx => { ctx.result = ctx.input * 2; return ctx })
        .do("step2", ctx => { return ctx.result })
    }
  }

  const builder = new ActionBuilder(new MyAction())
  const runner = new ActionRunner(builder)
  const result = await runner.run({input: 5})
  console.log(result) // 10
</script>
```

## TypeScript

The package ships declaration files under `src/types` and exposes them through
the package `types` entrypoint, so editors get completions and quick help out of
the box:

```ts
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"
```

No `tsconfig` setup is required to consume the types.

## Next step

With Actioneer installed, build your first pipeline in the
[Quick Start](/start/quick-start/).
