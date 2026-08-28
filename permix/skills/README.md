# Permix agent skills (TanStack Intent)

These skills teach AI assistants how to integrate [Permix](https://permix.letstri.dev) in **your** app — not how to work on the Permix library monorepo.

**Permix v4** uses action tuples (`post: ['read', { name: 'edit', type: Post }]`), not the v3 `{ action, dataType }` shape. Upgrading? See [migration guide](https://permix.letstri.dev/docs/migration-v3-to-v4).

## Install

```bash
pnpm add permix
pnpm dlx @tanstack/intent@latest install
```

Or:

```bash
npx skills add letstri/permix
```

Intent discovers `permix` in `node_modules`, reads the skills bundled with your installed version, and writes lightweight skill-loading guidance into your agent config (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, etc.).

```bash
pnpm dlx @tanstack/intent@latest list
pnpm dlx @tanstack/intent@latest load permix#permix
```

When you `pnpm update permix`, skills update with the package.

### Manual install (Cursor)

```bash
cp -r node_modules/permix/skills/permix .agents/skills/
cp -r node_modules/permix/skills/permix-getting-started .agents/skills/
```

Restart Cursor or start a new agent chat so skills are picked up.

## Principles

The `permix` skill produces these by construction. The final verify checklist checks them.

- **Same schema, same paths** on client and server.
- **Server enforces; client is UX.** Every UI path has a server twin.
- **`hydrate` restores booleans only.** Client `setup()` restores function/ReBAC rules.
- **Do not `check` before ready.**
- **v4 action tuples**, not v3 `{ action, dataType }`.
- **Import `permix/<adapter>`**, never a guessed export (`permix/remix` does not exist).
- **Provider identity is not authorization.** JWTs/sessions feed `resolveRules`; they do not replace Permix or RLS.

## What it covers

- **Schema and roles** — `createPermix`, `setup`, `template`, `createRules` (`permix-getting-started`).
- **Checks** — dot paths, callbacks, `~all`/`~any`, ReBAC closures, `isReady`.
- **UI** — React factory, Vue/Solid/Svelte provider + hooks, declarative `Check`.
- **Full-stack SSR** — Next.js resolver + Cache Components, TanStack Start, React Router 7, Nuxt, Astro.
- **HTTP/RPC** — Express, Hono, Fastify, Node, srvx/`permix/server`, Elysia, Nest, tRPC, oRPC.
- **Opt-in** — Drizzle, Effect, Standard Schema, catalog extraction.
- **Providers** — HTTP PDP, Supabase, Better Auth, Clerk, Convex.

## References

The `permix/SKILL.md` overview is always loaded; references split so the agent pulls only what the task needs.

**Core**

- [`permix/references/check.md`](./permix/references/check.md)
- [`permix/references/hydration.md`](./permix/references/hydration.md)
- [`permix/references/security.md`](./permix/references/security.md)
- [`permix/references/example.md`](./permix/references/example.md) — invariant → `examples/` map

**UI / full-stack / HTTP** — one file per adapter under [`permix/references/`](./permix/references/).

**Opt-in / providers** — `drizzle.md`, `effect.md`, `standard-schema.md`, `extraction.md`, `pdp.md`, `supabase.md`, `better-auth.md`, `clerk.md`, `convex.md`.

## Skills

| Skill | Intent id | When to use |
| --- | --- | --- |
| [permix-getting-started](./permix-getting-started/SKILL.md) | `permix#permix-getting-started` | New project, schema, `setup`, roles/templates |
| [permix](./permix/SKILL.md) | `permix#permix` | Everything past setup: follow the workflow, then load the matching reference |

## Registry and version history

The package includes the `tanstack-intent` npm keyword. Published versions are indexed on the [Agent Skills Registry](https://tanstack.com/intent/registry).

## Without skills

- Official docs: https://permix.letstri.dev/docs
- LLM-oriented exports: https://permix.letstri.dev/llms.txt and https://permix.letstri.dev/llms-full.txt

## Maintainer workflow (this repo)

From `permix/`:

```bash
pnpm run skills:validate   # structure + packaging before publish
pnpm run skills:stale      # flag drift vs docs/sources
```

CI runs `intent validate` on PRs and `intent stale` after releases (`.github/workflows/check-skills.yml`). Release Please bumps `library_version` in SKILL frontmatter with the package version.
