---
title: Introduction
description: What Actioneer is, who it's for, and the problems it solves.
---

Actioneer is a small, focused **action orchestration library** for Node.js and
browser environments. It provides a fluent builder for composing activities and
a concurrent runner with lifecycle hooks and control-flow semantics
(`while` / `until` / `if` / `break` / `continue` / `split`).

It was extracted from a larger codebase to expose a compact API for building
pipelines of work that can run concurrently, with hook support and nested
pipelines.

## Why Actioneer?

When a task grows past "call a few functions in a row," you usually end up
hand-rolling the same machinery: a shared state object threaded through each
step, a loop here, a conditional there, some logging around the edges, and a way
to run the whole thing across a batch of inputs without melting your event loop.

Actioneer packages that machinery into a small, declarative API:

- **Describe steps, not plumbing.** Each step is an _activity_ added with
  `.do(name, operation)`. Operations receive a shared **context** object they
  read from and write to, and return it to pass it to the next step.
- **Control flow is first-class.** Loops, conditionals, early exits, and
  parallel sections are activity _modes_ — not ad-hoc `for` loops scattered
  through your code. See [Activity Modes](/guides/activity-modes/).
- **Concurrency is built in.** Run one context with [`run()`](/guides/run-vs-pipe/)
  or fan out across many with [`pipe()`](/guides/run-vs-pipe/) and a concurrency
  limit.
- **Observability is opt-in.** Attach [lifecycle hooks](/guides/hooks/) to any
  activity for logging, metrics, setup, and cleanup.

## Who is this for?

Actioneer is for developers who want to **incorporate a pipeline runner into
their own projects** — batch processors, build steps, data transforms, task
queues, scrapers, or any workflow that benefits from composable steps and
controlled concurrency.

It is deliberately small and has a single runtime dependency
([`@gesslar/toolkit`](https://github.com/gesslar/toolkit)). There is no build
step, no framework lock-in, and it ships TypeScript declarations for editor
support.

## What's included

Actioneer exports a handful of classes:

| Class | Role |
| ----- | ---- |
| [`ActionBuilder`](/reference/action-builder/) | Fluent builder for composing activities into a pipeline |
| [`ActionRunner`](/reference/action-runner/) | Executes a pipeline once (`run`) or concurrently (`pipe`) |
| [`Activity` / `ACTIVITY`](/reference/activity/) | Activity definitions and the mode flags (`WHILE`, `UNTIL`, `IF`, `BREAK`, `CONTINUE`, `SPLIT`) |
| [`ActionHooks`](/reference/action-hooks/) | Lifecycle hook management (file-based loading in Node.js) |
| `ActionWrapper` | Internal activity container and iterator |
| [`Piper`](/reference/piper/) | Base concurrent processing with worker pools |

## Environment support

Actioneer is environment-aware and automatically detects whether it is running
in a browser or Node.js. The browser variant works everywhere — Node.js,
browsers, Tauri, Electron, and Deno. The Node.js variant adds file-based hook
loading via `withHooksFile()`.

Ready to build something? Head to [Installation](/start/installation/).
