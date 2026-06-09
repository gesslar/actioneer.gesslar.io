---
title: Activity Modes
description: The six execution modes — Default, WHILE, UNTIL, IF, BREAK, CONTINUE, and SPLIT — and when to use each.
---

Every activity you add with `.do()` runs in one of several **modes**. The mode
controls _how_ the operation executes — once, in a loop, conditionally, or in
parallel. Modes are selected with the `ACTIVITY` enum:

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"
```

:::caution[One mode per activity]
Each activity can have exactly one mode. Combining modes throws an error. To
compose behaviors, use separate activities — often inside a
[nested builder](/guides/nested-pipelines/).
:::

## Execute once (default)

The simplest mode runs an activity exactly once per context. Just pass a name
and an operation:

```js
class MyAction {
  setup(builder) {
    builder.do("processItem", ctx => {
      ctx.result = ctx.input * 2
    })
  }
}
```

## WHILE

Loops **while** a predicate returns `true`. The predicate is evaluated
**before** each iteration, so the body may run zero times.

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class CounterAction {
  #shouldContinue = ctx => ctx.count < 10
  #increment = ctx => { ctx.count += 1 }

  setup(builder) {
    builder
      .do("initialize", ctx => { ctx.count = 0 })
      .do("countUp", ACTIVITY.WHILE, this.#shouldContinue, this.#increment)
      .do("finish", ctx => { return ctx.count })
  }
}
```

**Signature:** `.do(name, ACTIVITY.WHILE, predicate, operation)`

## UNTIL

Loops **until** a predicate returns `true`. The predicate is evaluated
**after** each iteration, so the body always runs at least once.

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class ProcessorAction {
  #queueIsEmpty = ctx => ctx.queue.length === 0

  #processItem = ctx => {
    const item = ctx.queue.shift()
    ctx.processed.push(item)
  }

  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.queue = [1, 2, 3, 4, 5]
        ctx.processed = []
      })
      .do("process", ACTIVITY.UNTIL, this.#queueIsEmpty, this.#processItem)
      .do("finish", ctx => { return ctx.processed })
  }
}
```

**Signature:** `.do(name, ACTIVITY.UNTIL, predicate, operation)`

:::tip[WHILE vs UNTIL]
Use **WHILE** when the body might need to be skipped entirely (check first). Use
**UNTIL** when the body must run at least once (check after).
:::

## IF

Conditionally runs an activity **at most once**. If the predicate is `true`, the
operation runs once; if `false`, the activity is skipped entirely.

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class ConditionalAction {
  #shouldProcess = ctx => ctx.value > 10
  #processLargeValue = ctx => { ctx.processed = ctx.value * 2 }

  setup(builder) {
    builder
      .do("initialize", ctx => { ctx.value = 15 })
      .do("maybeProcess", ACTIVITY.IF, this.#shouldProcess, this.#processLargeValue)
      .do("finish", ctx => { return ctx })
  }
}
```

**Signature:** `.do(name, ACTIVITY.IF, predicate, operation)`

## BREAK and CONTINUE

`BREAK` and `CONTINUE` control loops from the inside, mirroring their JavaScript
namesakes. Both must live inside a [nested builder](/guides/nested-pipelines/)
that is the body of a `WHILE` or `UNTIL` loop.

- **`BREAK`** exits the enclosing loop when its predicate is `true`.
- **`CONTINUE`** skips the rest of the current iteration when its predicate is
  `true`.

```js
.do("loop", ACTIVITY.WHILE, ctx => ctx.count < 100,
  new ActionBuilder()
    .do("increment", ctx => { ctx.count++; return ctx })
    .do("earlyExit", ACTIVITY.BREAK, ctx => ctx.count >= 5)
)
```

**Signatures:** `.do(name, ACTIVITY.BREAK, predicate)` and
`.do(name, ACTIVITY.CONTINUE, predicate)`

These get their own deep dive in [Control Flow](/guides/control-flow/).

## SPLIT

Fans a context out into multiple parallel sub-runs, then rejoins the results.
SPLIT needs a **splitter** (divides the context), a **rejoiner** (recombines
results), and an **operation** (runs per split).

```js
.do("parallel", ACTIVITY.SPLIT, splitter, rejoiner, operation)
```

Because parallel work and settled results have a few sharp edges, SPLIT has a
dedicated guide: [Parallelism with SPLIT](/guides/split/).

## Mode summary

| Mode | Signature | Predicate timing | Use case |
| ---- | --------- | ---------------- | -------- |
| **Default** | `.do(name, operation)` | — | Execute once per context |
| **WHILE** | `.do(name, ACTIVITY.WHILE, predicate, operation)` | Before iteration | Loop while condition is true |
| **UNTIL** | `.do(name, ACTIVITY.UNTIL, predicate, operation)` | After iteration | Loop until condition is true |
| **IF** | `.do(name, ACTIVITY.IF, predicate, operation)` | Before execution | Run once or skip |
| **BREAK** | `.do(name, ACTIVITY.BREAK, predicate)` | When reached | Exit enclosing loop |
| **CONTINUE** | `.do(name, ACTIVITY.CONTINUE, predicate)` | When reached | Skip to next iteration |
| **SPLIT** | `.do(name, ACTIVITY.SPLIT, splitter, rejoiner, operation)` | — | Parallel split/rejoin |

## Constraints

- **One mode per activity.** Combining modes throws.
- **SPLIT requires both functions.** The splitter and rejoiner are mandatory.
- **Predicates return booleans.** All predicates (`WHILE`, `UNTIL`, `IF`,
  `BREAK`, `CONTINUE`) should return `true` or `false`.
- **BREAK/CONTINUE need a loop.** They only work inside a nested builder that is
  the body of a `WHILE` or `UNTIL` activity.
