# Agent guide (Permix repository)

This repo is the **Permix** monorepo (library v4, docs site, examples). Most agents here are **maintainers** working on the package, docs, or examples.

## Consumer skills (for app developers)

Skills for teams **using** Permix ship in the published npm package at [`permix/skills/`](permix/skills/README.md). Repo-root [`skills/permix`](skills/permix) is a symlink alias (same pattern as [redux-toolkit/skills](https://github.com/reduxjs/redux-toolkit/tree/master/skills)) so CI and GitHub resolve skills from the monorepo root. Consumers install via [TanStack Intent](https://tanstack.com/intent/latest/docs/overview) (`pnpm dlx @tanstack/intent@latest install`) or copy from `node_modules/permix/skills/`.

Repo-root [`_artifacts/`](_artifacts/skill_tree.yaml) (`domain_map.yaml`, `skill_spec.md`, `skill_tree.yaml`) tracks skill coverage and source-doc references for CI staleness checks.

When you change public API behavior, docs examples, or integration patterns, keep `permix/skills/` aligned with `docs/content/docs/` and `examples/`, then run `cd permix && pnpm run skills:stale`. Release Please bumps `library_version` in SKILL frontmatter on release.

## Repository layout

| Path | Purpose |
| --- | --- |
| `permix/` | Published npm package (`permix`); build inside this folder |
| `permix/src/core/` | Core API (`createPermix`, `setup`, `check`, `template`, `merge`, events) |
| `permix/src/<framework>/` | Adapters (`react`, `vue`, `express`, `trpc`, `next`, …) |
| `docs/` | Documentation site (Fumadocs + TanStack Start) |
| `docs/content/docs/` | MDX documentation pages |
| `docs/src/routes/` | App routes; homepage code samples in `docs/src/routes/-code/` |
| `examples/` | Runnable sample apps — reference when validating integrations |
| `permix/skills/` | Agent skills shipped in the npm package (TanStack Intent) |
| `skills/permix` | Symlink → `permix/skills/` for monorepo-root discovery and CI |
| `_artifacts/` | Intent domain map, skill spec, and skill tree for CI staleness |

Docs site: https://permix.letstri.dev — machine-readable exports: `/llms.txt` and `/llms-full.txt` on the docs app.

## Maintainer commands

From repo root (pnpm workspace: `permix`, `docs`, `examples/*`):

```bash
pnpm install
pnpm verify                 # format, lint, test, types, build
pnpm test && pnpm run check-types
pnpm run lint
pnpm run format
pnpm run format:check
cd permix && pnpm run build
cd permix && pnpm run size:compare # run after build
cd docs && pnpm dev          # http://localhost:3000
cd docs && pnpm types:check  # fumadocs-mdx + tsc for docs only
```

Bundle-size fixtures, budgets, and the committed baseline live in [`permix/benchmarks/`](permix/benchmarks/README.md). Every public export and the extractor CLI must remain covered. Do not raise budgets or refresh the baseline solely to make CI pass; inspect the generated bundle, document an intentional increase, and keep browser fixtures free of extractor dependencies.

Use [Conventional Commits](https://www.conventionalcommits.org/). Husky runs commitlint on `commit-msg`. Release Please on `main` opens a release PR that bumps `permix`, updates [CHANGELOG.md](CHANGELOG.md), and tags `vMAJOR.MINOR.PATCH`. Merging that PR publishes a GitHub Release; npm publish runs from `.github/workflows/npm-publish.yml`. The docs changelog page (`/docs/changelog`) inlines repo-root `CHANGELOG.md` at compile time.

Do not commit unless the user asks.
