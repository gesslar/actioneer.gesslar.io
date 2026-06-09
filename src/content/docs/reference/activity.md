---
title: Activity & ACTIVITY
description: API reference for the ACTIVITY mode flags and the Activity definition class.
---

`ACTIVITY` is the frozen enum of execution mode flags you pass to
[`.do()`](/reference/action-builder/#doname-args). `Activity` is the internal
class that wraps each step's definition — you rarely construct one directly, but
it's exported for completeness.

```js
import {Activity, ACTIVITY} from "@gesslar/actioneer"
```

## `ACTIVITY`

A frozen object mapping mode names to numeric flags:

```js
ACTIVITY = Object.freeze({
  WHILE:    1,
  UNTIL:    2,
  SPLIT:    3,
  IF:       4,
  BREAK:    5,
  CONTINUE: 6,
})
```

| Flag | Meaning | `.do()` signature |
| ---- | ------- | ----------------- |
| `ACTIVITY.WHILE` | Loop while predicate is true (checked before) | `.do(name, ACTIVITY.WHILE, predicate, operation)` |
| `ACTIVITY.UNTIL` | Loop until predicate is true (checked after) | `.do(name, ACTIVITY.UNTIL, predicate, operation)` |
| `ACTIVITY.SPLIT` | Parallel split/rejoin | `.do(name, ACTIVITY.SPLIT, splitter, rejoiner, operation)` |
| `ACTIVITY.IF` | Run once if predicate is true | `.do(name, ACTIVITY.IF, predicate, operation)` |
| `ACTIVITY.BREAK` | Exit enclosing loop | `.do(name, ACTIVITY.BREAK, predicate)` |
| `ACTIVITY.CONTINUE` | Skip to next loop iteration | `.do(name, ACTIVITY.CONTINUE, predicate)` |

The **default mode** (run once) uses no flag at all: `.do(name, operation)`.

For full explanations and examples, see [Activity Modes](/guides/activity-modes/)
and [Control Flow](/guides/control-flow/).

## Function shapes

| Role | Signature | Notes |
| ---- | --------- | ----- |
| `operation` | `(context) => unknown \| Promise<unknown>` | The work; may also be a nested `ActionBuilder`. |
| `predicate` | `(context) => boolean \| Promise<boolean>` | Must return a boolean. |
| `splitter` | `(context) => Array<unknown>` | Returns one context per parallel task. |
| `rejoiner` | `(originalContext, settledResults) => unknown` | Receives `Promise.allSettled()` output. |

## `Activity`

The `Activity` class is the internal wrapper that holds a single step's
definition — its name, mode (`kind`), operation, predicate, and (for SPLIT) the
splitter and rejoiner. It's created for you by
[`ActionBuilder`](/reference/action-builder/) when you call `.do()`; you don't
normally instantiate it yourself.

It's exported mainly so the type is available for advanced or introspective use.
For everyday pipelines, work through the builder.

## Related

- [Activity Modes](/guides/activity-modes/) — the modes in depth.
- [Control Flow](/guides/control-flow/) — `BREAK` and `CONTINUE`.
- [Parallelism with SPLIT](/guides/split/) — splitter/rejoiner mechanics.
