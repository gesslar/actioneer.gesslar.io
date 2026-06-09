# actioneer.gesslar.io

Developer documentation for [`@gesslar/actioneer`](https://github.com/gesslar/actioneer)
— a small, focused action orchestration library for Node.js and the browser.

Built with [Astro](https://astro.build) and
[Starlight](https://starlight.astro.build).

## Development

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:4321
npm run build    # build the static site to ./dist
npm run preview  # preview the production build locally
```

## Structure

```
src/
  content/docs/        Markdown/MDX documentation pages
    index.mdx          Landing page
    introduction.md
    start/             Installation, quick start, core concepts
    guides/            Activity modes, control flow, hooks, etc.
    reference/         Per-class API reference
  content.config.ts    Starlight content collection config
astro.config.mjs       Site + sidebar configuration
```

To add or reorder pages, edit the `sidebar` array in `astro.config.mjs` and add
the corresponding Markdown file under `src/content/docs/`.

## License

Documentation content follows the same terms as Actioneer
([0BSD](https://github.com/gesslar/actioneer/blob/main/LICENSE.txt)).
