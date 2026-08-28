# Permix — Agent skill specification

Library: **permix** @ 4.1.2  
Repository: https://github.com/letstri/permix  
Docs: https://permix.letstri.dev/docs

## Purpose

These skills teach coding agents how to integrate Permix v4 in consumer applications: schema design, `setup`, `check`, UI adapters, server middleware, SSR hydration, HTTP PDP, and provider identity adapters. They are derived from `docs/content/docs/` and `permix/src/` — not from model training cutoffs.

## Skill inventory

| Slug | Type | Domain | Load when |
|------|------|--------|-----------|
| `permix-getting-started` | core | core-setup | New Permix install, schema, roles, templates |
| `permix` | core | authorization + frontend + server | Everything past initial setup. Thin `SKILL.md` with invariants, workflow, verify checklist, and per-adapter references loaded on demand. |

## Dependency graph

```text
permix-getting-started
└── permix
    ├── Core: check, hydration, security, example
    ├── UI: react, vue, solid, svelte
    ├── Full-stack: next, tanstack-start, react-router, nuxt, astro
    ├── HTTP/RPC: server, express, hono, fastify, node, elysia, nest, trpc, orpc
    ├── Opt-in: drizzle, effect, standard-schema, extraction
    └── Providers: pdp, supabase, better-auth, clerk, convex
```

## Critical failure modes

See `_artifacts/domain_map.yaml` → `failure_modes`. Highest priority:

1. **v3 schema shape in v4 projects** — use action tuples, not `{ action, dataType }`.
2. **hydrate without client `setup`** — dynamic rules are lost in JSON; always `setup` after hydrate.
3. **Client-only checks** — mirror paths on server with `setupMiddleware` + `checkMiddleware` (or the matching adapter).
4. **Treating app checks as database enforcement** — Supabase browser access still requires RLS; JWT claims may remain stale until refresh.

## Source-of-truth policy

When `docs/content/docs/` or public API in `permix/src/` changes:

1. Update the affected `permix/skills/*/SKILL.md` and the matching `references/<adapter>.md`.
2. Run `pnpm run skills:stale` from `permix/` (or monorepo CI `intent stale`).
3. Align `sources` in SKILL frontmatter with the changed doc paths.

Invariants live in `permix/SKILL.md`. Framework details live in `references/<name>.md`. Do not paste full docs into the skill.

## Registry

Package keyword `tanstack-intent` enables discovery on the [Agent Skills Registry](https://tanstack.com/intent/registry). Each npm release re-indexes skills and version history automatically.
