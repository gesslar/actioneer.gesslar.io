---
title: Lifecycle Hooks
description: Run cross-cutting logic before and after each activity with ActionHooks — validation, resource injection, timing, and auditing, kept separate from your pipeline.
---

Hooks let you run code **before and after each activity** in your pipeline,
declared in a separate object keyed by activity name. They're the place for
**cross-cutting concerns** — work that applies _around_ many activities but
doesn't belong _inside_ any of them: validating inputs, injecting resources,
timing, auditing, enforcing invariants.

Because the hooks live in their own object, you can swap the whole set (a
no-op set in production, an instrumented set in tests) without touching a single
activity.

## What hooks can do

- **Validate and guard.** A hook that throws aborts the pipeline — so a
  `before$` hook is a clean place to assert preconditions before an activity
  runs, or an `after$` hook to verify the result.
- **Inject resources.** Attach a database handle, HTTP client, auth token, or
  config to the context in `before$` so the activity itself stays pure and
  testable.
- **Measure.** Stamp a start time in `before$`, record the duration in `after$`
  — per activity, without cluttering the activity.
- **Audit.** `after$` receives both the pre-activity context and the result, so
  you can record what each step changed.
- **Set up and tear down.** Optional `setup`/`cleanup` methods run once around a
  `pipe()` batch for resource lifecycle.
- **Observe.** Logging and metrics, the classic case.

## How hooks receive data

Three things govern everything below — verify these once and the patterns fall
out naturally:

- **`before$<activity>(context)`** receives the context **about to enter** the
  activity (one argument).
- **`after$<activity>(before, after)`** receives **two** arguments: the context
  as it entered the activity, and whatever the activity's operation **returned**.
- **Hooks are mutation-only.** A hook's return value is ignored. To affect the
  pipeline, mutate the context object in place (or throw).
- **Throwing aborts the run.** An error from any hook propagates as a `Sass`
  error and stops the pipeline (after [`done()`](/guides/done/) runs).

:::caution[Diffing before vs. after]
The two `after$` arguments are only **distinct objects** when the operation
returns a _new_ object. With the common mutate-and-`return ctx` pattern, the
operation hands back the same reference it received, so `before === after` and
both already show the mutated state. If you need a true before/after diff, have
that operation return a new object (or snapshot what you need in `before$`).
:::

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
      .do("prepare", ctx => { ctx.count = 0; return ctx })
      .do("work", ctx => { ctx.count += 1; return ctx })
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
      .do("prepare", ctx => { ctx.count = 0; return ctx })
      .do("work", ctx => { ctx.count += 1; return ctx })
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

A hooks class exposes methods (or arrow-function fields) named with the
convention `event$activityName`, where `event` is `before` or `after`. Optional
`setup` and `cleanup` methods run once around a `pipe()` batch.

```js
// hooks/DocHooks.js
export class DocHooks {
  // Runs once before any items are processed — async, can fetch or open
  // resources. Throwing here aborts the run before it starts.
  setup = async() => {
    this.client = await openApiClient()
  }

  // before$ receives the context entering the activity. Mutate it in place to
  // inject resources or normalize input.
  before$render = ctx => {
    ctx.client = this.client       // inject — keeps the activity pure
  }

  // after$ receives (before, after): the pre-activity context and whatever the
  // activity returned. Mutate the result to post-process it.
  after$render = (before, result) => {
    if(Array.isArray(result?.sections))
      result.sections = result.sections.map(s => s.trim())
  }

  // Runs once after all items finish — close what setup opened.
  cleanup = async() => {
    await this.client?.close()
  }
}
```

Hooks can be `async`; the runner awaits them. Their return value is ignored —
mutate the context/result, or throw to abort.

:::note[`setup`/`cleanup` are `pipe()`-scoped]
`before$`/`after$` fire for every activity under both `run()` and `pipe()`. The
`setup` and `cleanup` lifecycle methods, however, belong to the **batch
lifecycle** — they run once at the start and end of a
[`runner.pipe(items)`](/reference/action-runner/) call, and **not** for a bare
`runner.run(ctx)`. If you depend on `setup` to open a resource, drive the runner
with `pipe()` (pass a single-element array for one item).
:::

## Hook naming convention

Activity names are normalized into method names. The whole name is **lowercased**,
non-word characters are stripped, and words are split on **spaces** and
camelCased — the first word stays lowercase.

| Activity name | Hook methods |
| ------------- | ------------ |
| `"do work"` | `before$doWork` / `after$doWork` |
| `"step-1"` | `before$step1` / `after$step1` |
| `"Prepare Data"` | `before$prepareData` / `after$prepareData` |
| `"formatFunction"` | `before$formatfunction` / `after$formatfunction` |

:::caution[camelCase activity names collapse]
Words are only split on **spaces**, and the whole name is lowercased first. A
single-word camelCase activity name like `"formatFunction"` becomes
`after$formatfunction` (all lowercase) — _not_ `after$formatFunction`. If you
want a camelCased hook name, put a space in the activity name
(`"format function"` → `after$formatFunction`).
:::

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

## Common patterns

These are the kinds of things hooks are actually for — drawn from real pipelines
that parse and format documentation, where hooks adapt stock activities without
forking them.

### Scrub or normalize data

An `after$` hook can clean up what an activity produced — strip fields you don't
want downstream, trim whitespace, drop empties:

```js
export class Parse {
  // After tags are extracted, drop the @example tag entirely
  after$extractTags = ctx => {
    delete ctx.tag?.example
  }
}
```

### Inject resources, keep activities pure

Fetch or open a resource once in `setup`, hand it to each activity through the
context in `before$`. The activity never touches credentials or network setup,
so it stays trivial to test. `setup` throwing aborts the run before any work
begins:

```js
export class Format {
  setup = async() => {
    const {status, jokes, error} = await fetchJokes()

    if(status === "error")
      throw new Error(`Failed to fetch jokes: ${error}`)

    this.jokes = jokes
  }

  // Enrich each function's description before it is formatted
  before$formatFunction = ctx => {
    const joke = this.jokes.pop()

    if(joke && ctx.description)
      ctx.description.push("", joke)
  }
}
```

### Post-process the result

`after$` receives the activity's return value as its **second** argument. Mutate
it in place to transform output — here, rewriting Markdown code fences into
MediaWiki syntax after a "format function" activity runs:

```js
export class Format {
  after$formatFunction = (ctx, result) => {
    if(!Array.isArray(result?.formatted))
      return

    result.formatted = result.formatted.map(section =>
      section.replace(
        /```c\n([\s\S]+?)```/g,
        "<syntaxhighlight lang=\"c\">\n$1</syntaxhighlight>\n",
      ),
    )
  }
}
```

### Validate and guard

Because a throwing hook aborts the pipeline, `before$` is a natural precondition
check — fail fast before an expensive or irreversible activity runs:

```js
export class PaymentHooks {
  before$charge = ctx => {
    if(!(ctx.amount > 0))
      throw new Error(`charge amount must be positive, got ${ctx.amount}`)
  }
}
```

### Publish as a side effect

An `after$` on a final activity can push the result somewhere — upload to a wiki,
write to a bucket, notify a service — using a resource opened in `setup`:

```js
export class Format {
  setup = async() => {
    const {BASE_URL, BOT_USERNAME, BOT_PASSWORD} = process.env
    this.wiki = await login({BASE_URL, BOT_USERNAME, BOT_PASSWORD})
  }

  after$finalize = async(ctx, result) => {
    await this.wiki.createOrEditPage({
      title: result.moduleName,
      content: result.content,
    })
  }
}
```

## Hooks and nested pipelines

When you nest builders (for [loops](/guides/control-flow/) or
[parallel sections](/guides/split/)), the parent's hooks are **automatically
passed to all children**. Hook behavior stays consistent throughout the entire
pipeline hierarchy — you configure them once at the top.

See the [ActionHooks reference](/reference/action-hooks/) for the full
constructor options.
