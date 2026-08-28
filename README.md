# Permix

[![npm version](https://badge.fury.io/js/permix.svg)](https://npmjs.com/package/permix) [![license](https://img.shields.io/github/license/letstri/permix)](https://github.com/letstri/permix/blob/main/LICENSE) [![CI](https://github.com/letstri/permix/actions/workflows/types-check.yml/badge.svg)](https://github.com/letstri/permix/actions) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9%20%7C%206%20%7C%207-3178C6) ![core gzip](https://img.shields.io/badge/core-2.64%20kB%20gzip-purple)

Permix is a lightweight, framework-agnostic, type-safe permissions library for TypeScript on the client and the server.

- **Typed schema** — `createPermix<D>()` is the source of truth for every path (`post.update`)
- **Isomorphic** — the same definition on UI, HTTP, RPC, and full-stack adapters
- **ReBAC without a second API** — capture the actor at `setup()`, pass the resource at `check()`
- **SSR** — `dehydrate` / `hydrate` plus `PermixHydrate` for first paint
- **20+ adapters** — React, Vue, Solid, Svelte, Next.js, TanStack Start, Nest, tRPC, and more
- **Agent skills** — versioned with the npm package (TanStack Intent)

## Quick start

```ts
import { createPermix } from 'permix'

const permix = createPermix<{
  post: ['read']
}>()

permix.setup({
  post: {
    read: true,
  },
})

permix.check('post.read') // true
```

Entity-aware check (ReBAC):

```ts
const permix = createPermix<{
  post: [{ name: 'update'; type: { authorId: string }; required: true }]
}>()

permix.setup({
  post: {
    update: (post) => post.authorId === user.id,
  },
})

permix.check('post.update', post)
```

## Integrations

|  | Import | Docs |
| --- | --- | --- |
| **UI** | `permix/react`, `vue`, `solid`, `svelte` | [React](https://permix.letstri.dev/docs/integrations/react) · [Vue](https://permix.letstri.dev/docs/integrations/vue) · [Solid](https://permix.letstri.dev/docs/integrations/solid) · [Svelte](https://permix.letstri.dev/docs/integrations/svelte) |
| **Full-stack** | `permix/next`, `tanstack-start`, `react-router`, `nuxt`, `astro` | [Next.js](https://permix.letstri.dev/docs/integrations/next) · [TanStack Start](https://permix.letstri.dev/docs/integrations/tanstack-start) · [React Router](https://permix.letstri.dev/docs/integrations/react-router) · [Nuxt](https://permix.letstri.dev/docs/integrations/nuxt) · [Astro](https://permix.letstri.dev/docs/integrations/astro) |
| **HTTP / RPC** | `permix/express`, `hono`, `fastify`, `node`, `server`, `elysia`, `nest`, `trpc`, `orpc` | [Express](https://permix.letstri.dev/docs/integrations/express) · [tRPC](https://permix.letstri.dev/docs/integrations/trpc) · [Nest](https://permix.letstri.dev/docs/integrations/nest) |
| **Data / schema** | `permix/drizzle`, `effect`, `standard-schema` | [Drizzle](https://permix.letstri.dev/docs/integrations/drizzle) · [Effect](https://permix.letstri.dev/docs/integrations/effect) · [Standard Schema](https://permix.letstri.dev/docs/integrations/standard-schema) |
| **Providers** | `permix/pdp`, `supabase`, `better-auth`, `clerk`, `convex` | [PDP](https://permix.letstri.dev/docs/integrations/pdp) · [Supabase](https://permix.letstri.dev/docs/integrations/supabase) · [Better Auth](https://permix.letstri.dev/docs/integrations/better-auth) · [Clerk](https://permix.letstri.dev/docs/integrations/clerk) · [Convex](https://permix.letstri.dev/docs/integrations/convex) |

Full documentation: [permix.letstri.dev](https://permix.letstri.dev/docs). Examples: [`examples/`](https://github.com/letstri/permix/tree/main/examples).

## Agent skills

```bash
npx skills add letstri/permix
# or, after pnpm add permix:
pnpm dlx @tanstack/intent@latest install
```

Skills ship inside the npm package and are indexed on the [Agent Skills Registry](https://tanstack.com/intent/registry). See [`permix/skills/README.md`](permix/skills/README.md).

## Changelog

[CHANGELOG.md](CHANGELOG.md) · [docs changelog](https://permix.letstri.dev/docs/changelog)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

MIT License — see [LICENSE](https://github.com/letstri/permix/blob/main/LICENSE).
