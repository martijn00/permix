# Bundle-size benchmarks

This directory measures realistic consumer entry points instead of comparing the published files on disk. Each fixture in `entries/` imports a public Permix subpath and keeps representative runtime code alive through bundling.

## Workflow

Build the package before measuring because fixtures resolve through the published `exports` map:

```bash
pnpm run build
pnpm run size
pnpm run size:compare
```

- `size` prints the current minified and gzip sizes.
- `size:json` prints the same report as JSON for tooling.
- `size:compare` enforces hard budgets and allowed growth from the committed baseline.
- `size:update-baseline` rewrites `bundle-size-baseline.json` after an intentional, reviewed change.

Generated bundles are written to `.bundle-size/` for inspection and are not committed.

## Methodology

The harness uses esbuild to produce one minified ESM bundle per fixture with `NODE_ENV=production`. Browser fixtures target ES2022; server fixtures target Node 22. Peer dependencies and their subpaths are external, while Permix runtime dependencies remain bundled. The Svelte fixture compiles packaged `.svelte` components with `svelte/compiler` before bundling. Gzip figures use level 9.

Every public package export except `./package.json` must have a registered fixture. The `permix` extractor CLI is tracked separately from the `permix/extractor` API. Browser graphs are also checked through esbuild's metafile and emitted code to ensure `chokidar`, `oxc-parser`, and `tinyglobby` do not leak into client bundles.

## Budget policy

`bundle-size-budgets.json` has two safeguards:

1. `maxBytes` and `maxGzipBytes` are hard ceilings, initially set with roughly 10–15% headroom over the measured baseline.
2. `maxDeltaBytes` and `maxDeltaGzipBytes` limit growth relative to the baseline. Delta limits are grouped by fixture size so small adapters cannot consume the full hard-budget headroom in one change.

Do not raise a budget or refresh the baseline just to make CI pass. First inspect `.bundle-size/`, explain the increase in the pull request, and update the baseline and budget only when the added runtime cost is intentional.
