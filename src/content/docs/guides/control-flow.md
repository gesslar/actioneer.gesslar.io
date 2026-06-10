---
title: Control Flow
description: Use BREAK and CONTINUE inside nested builders to control WHILE and UNTIL loops, and combine them for complex logic.
---

`WHILE` and `UNTIL` give you loops; `BREAK` and `CONTINUE` give you control
_inside_ those loops. Together with `IF`, they let you express branching logic
declaratively — without dropping back to hand-written `for` loops.

:::caution[Loop context required]
`BREAK` and `CONTINUE` only work inside a **nested `ActionBuilder`** that is the
body (operation) of a `WHILE` or `UNTIL` activity. Using them outside a loop
throws an error.
:::

## BREAK — exit the loop

`BREAK` terminates the enclosing loop immediately when its predicate returns
`true`. Execution continues with the next activity _after_ the loop.

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class BreakExample {
  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.count = 0
        ctx.items = []
        return ctx
      })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 100,
        new ActionBuilder()
          .do("increment", ctx => {
            ctx.count++
            ctx.items.push(ctx.count)
            return ctx
          })
          .do("earlyExit", ACTIVITY.BREAK, ctx => ctx.count >= 5)
      )
      .do("finish", ctx => { return ctx.items }) // [1, 2, 3, 4, 5]
  }
}
```

The loop predicate would allow up to 100 iterations, but `BREAK` exits once
`count` reaches 5.

## CONTINUE — skip to the next iteration

`CONTINUE` skips the remaining activities in the current iteration when its
predicate returns `true`, then continues with the next iteration. For `WHILE`,
the loop predicate is re-evaluated; for `UNTIL`, the operation runs again and
the predicate is checked after.

```js
import {ActionBuilder, ACTIVITY} from "@gesslar/actioneer"

class ContinueExample {
  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.count = 0
        ctx.processed = []
        return ctx
      })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 5,
        new ActionBuilder()
          .do("increment", ctx => {
            ctx.count++
            return ctx
          })
          .do("skipEvens", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
          .do("process", ctx => {
            ctx.processed.push(ctx.count)
            return ctx
          })
      )
      .do("finish", ctx => { return ctx.processed }) // [1, 3, 5]
  }
}
```

When `count` is even, `CONTINUE` skips the `process` step, so only odd numbers
are collected.

## Combining control flow

`IF`, `BREAK`, and `CONTINUE` compose freely within a single loop. Order
matters — activities run top to bottom each iteration.

```js
class CombinedExample {
  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.count = 0
        ctx.results = []
        return ctx
      })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 100,
        new ActionBuilder()
          .do("increment", ctx => { ctx.count++; return ctx })
          .do("exitAt10", ACTIVITY.BREAK, ctx => ctx.count > 10)
          .do("skipEvens", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
          .do("processLarge", ACTIVITY.IF, ctx => ctx.count > 5, ctx => {
            ctx.results.push(ctx.count * 10)
            return ctx
          })
          .do("processAll", ctx => {
            ctx.results.push(ctx.count)
            return ctx
          })
      )
  }
}
// Results: [1, 3, 5, 70, 7, 90, 9]
```

Walking through the result:

- `1, 3, 5` — odd numbers ≤ 5: only `processAll` pushes them.
- `7, 9` — odd numbers > 5: `processLarge` pushes `count * 10` first, then
  `processAll` pushes `count`.
- Even numbers are skipped by `CONTINUE`.
- The loop exits via `BREAK` once `count > 10`.

## Tips

- **Return the context** from operations inside nested builders (`return ctx`)
  so the updated state flows to the next activity.
- **Keep predicates pure.** They should only read the context and return a
  boolean — side effects belong in operations.
- For parallel fan-out rather than sequential looping, reach for
  [SPLIT](/guides/split/) instead.
