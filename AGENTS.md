# Agent guide (Permix repository)

This repo is the **Permix** monorepo (library v4, docs site, examples). Most agents here are **maintainers** working on the package, docs, or examples.

App developers using Permix should load the **consumer skills** in `permix/skills/` (published with the npm package), not this file.

Conventional commits, Release Please, and `pnpm verify` live in [CONTRIBUTING.md](CONTRIBUTING.md). Do not commit unless the user asks.

## Consumer skills

Skills for teams **using** Permix ship at [`permix/skills/`](permix/skills/README.md). Repo-root [`skills/permix`](skills/permix) is a symlink alias (same pattern as [redux-toolkit/skills](https://github.com/reduxjs/redux-toolkit/tree/master/skills)). Consumers install via [TanStack Intent](https://tanstack.com/intent/latest/docs/overview) (`pnpm dlx @tanstack/intent@latest install`) or copy from `node_modules/permix/skills/`.

[`_artifacts/`](_artifacts/skill_tree.yaml) (`domain_map.yaml`, `skill_spec.md`, `skill_tree.yaml`) tracks coverage for CI staleness checks.

### Skill authoring

- Invariants and the ordered workflow live in [`permix/skills/permix/SKILL.md`](permix/skills/permix/SKILL.md).
- Framework details live in `permix/skills/permix/references/<adapter>.md` (short: import, one snippet, pitfalls, docs + example link). Do not paste full docs.
- When public API, docs examples, or integration patterns change: update the matching skill reference, keep `sources` in SKILL frontmatter aligned with `docs/content/docs/`, then run `cd permix && pnpm run skills:validate && pnpm run skills:stale`.
- Release Please bumps `library_version` in SKILL frontmatter on release.

## Adapters

| Group | `permix/src/` | Docs |
| --- | --- | --- |
| Core | `core/` | [Instance](docs/content/docs/guide/instance.mdx), [Check](docs/content/docs/guide/check.mdx) |
| UI | `react/`, `vue/`, `solid/`, `svelte/` | `docs/content/docs/integrations/{react,vue,solid,svelte}.mdx` |
| Full-stack | `next/`, `tanstack-start/`, `react-router/`, `nuxt/`, `astro/` | matching `integrations/*.mdx` |
| HTTP / RPC | `express/`, `hono/`, `fastify/`, `node/`, `server/`, `elysia/`, `nest/`, `trpc/`, `orpc/` | matching `integrations/*.mdx` |
| Data | `drizzle/`, `effect/`, `standard-schema/` | matching `integrations/*.mdx` |
| Providers | `adapter/`, `pdp/`, `supabase/`, `better-auth/`, `clerk/`, `convex/` | matching `integrations/*.mdx` |
| Extraction | `extractor/` | [Extraction](docs/content/docs/guide/extraction.mdx) |

## Docs IA

Pages live in [`docs/content/docs/`](docs/content/docs/). Sidebar is [`docs/content/docs/meta.json`](docs/content/docs/meta.json).

- **Getting Started** — intro, quick-start, choose-adapter, migration, comparison, changelog
- **Guide** — concepts, instance, setup, check, template, rebac, extraction, hydration, ready, events, security
- **Cookbook** — rbac, feature-flags, enums
- **Integrations** — grouped UI / full-stack / HTTP / RPC / data / providers
- **Examples** — [`examples.mdx`](docs/content/docs/examples.mdx)

When you change X, also update Y:

| Change | Also update |
| --- | --- |
| Public adapter API | `docs/content/docs/integrations/<name>.mdx`, `permix/skills/permix/references/<name>.md`, example if any |
| Core `check` / `setup` / schema | guide MDX + `permix-getting-started` and `references/check.md` |
| README examples | `scripts/copy-readme.ts` copies root README into the published package |

## Repository layout

| Path | Purpose |
| --- | --- |
| `permix/` | Published npm package (`permix`); build inside this folder |
| `permix/src/core/` | Core API (`createPermix`, `setup`, `check`, `template`, `merge`, events) |
| `permix/src/<framework>/` | Adapters |
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
cd docs && pnpm dev          # http://localhost:3000
cd docs && pnpm types:check  # fumadocs-mdx + tsc for docs only
```
