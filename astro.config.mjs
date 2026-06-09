// @ts-check
import {defineConfig} from "astro/config"
import starlight from "@astrojs/starlight"

// https://astro.build/config
export default defineConfig({
  site: "https://actioneer.gesslar.io",
  integrations: [
    starlight({
      title: "Actioneer",
      description:
        "A small, focused action orchestration library for Node.js and the browser. Compose activities into pipelines and run them concurrently with lifecycle hooks and control flow.",
      tagline: "Action pipelines for Node.js and the browser.",
      logo: {
        src: "./src/assets/actioneer.svg",
        alt: "Actioneer",
      },
      favicon: "/favicon.svg",
      head: [
        // Fallback favicon for browsers that don't support SVG icons.
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/actioneer-256.png",
            sizes: "256x256",
            type: "image/png",
          },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/gesslar/actioneer",
        },
      ],
      lastUpdated: true,
      sidebar: [
        {
          label: "Start Here",
          items: [
            {label: "Introduction", slug: "introduction"},
            {label: "Installation", slug: "start/installation"},
            {label: "Quick Start", slug: "start/quick-start"},
            {label: "Core Concepts", slug: "start/concepts"},
          ],
        },
        {
          label: "Guides",
          items: [
            {label: "Activity Modes", slug: "guides/activity-modes"},
            {label: "Control Flow", slug: "guides/control-flow"},
            {label: "Parallelism with SPLIT", slug: "guides/split"},
            {label: "run() vs pipe()", slug: "guides/run-vs-pipe"},
            {label: "Finalizing with done()", slug: "guides/done"},
            {label: "Lifecycle Hooks", slug: "guides/hooks"},
            {label: "Nested Pipelines", slug: "guides/nested-pipelines"},
          ],
        },
        {
          label: "Reference",
          items: [
            {label: "ActionBuilder", slug: "reference/action-builder"},
            {label: "ActionRunner", slug: "reference/action-runner"},
            {label: "Activity & ACTIVITY", slug: "reference/activity"},
            {label: "ActionHooks", slug: "reference/action-hooks"},
            {label: "Piper", slug: "reference/piper"},
          ],
        },
      ],
    }),
  ],
})
