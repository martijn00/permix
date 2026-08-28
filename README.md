# Permix

[![npm version](https://badge.fury.io/js/permix.svg)](https://npmjs.com/package/permix) ![You need Permix](https://img.shields.io/badge/You_need-Permix-purple)

Permix is a lightweight, framework-agnostic, type-safe permissions management library for JavaScript applications on the client and server sides.

## Documentation

You can find the documentation [here](https://permix.letstri.dev).

## Example

To quick start you only need to write the following code:

```ts
import { permission } from 'permix'

export const canReadPost = permission({
  key: 'post.read',
  title: 'Read posts',
})
```

```bash
pnpm permix extract
```

```ts
import { createPermix } from 'permix'
import { type Definition, permissions } from './.permix/permissions'

const permix = createPermix<Definition>().setup({
  post: { read: true },
})

permix.check(permissions.post.read) // true
```

Mark paths with `permission()`, generate a typed catalog with `permix extract`, then pass `Definition` to `createPermix`. Manual generics (`createPermix<{ post: ['read'] }>()`) remain the escape hatch for dynamic keys.

`setup()` returns a frozen instance and does not mutate the factory. On the server, stash that returned instance per request (`setupMiddleware`, or `createPermix<D>().setup(rules)` inside the request). Do not share one instance across concurrent requests.

Permix has other powerful features, so here's check out the [docs](https://permix.letstri.dev/docs) or the [examples](https://github.com/letstri/permix/tree/main/examples) directory.

## Agent skills (TanStack Intent)

Permix ships [versioned agent skills](permix/skills/README.md) inside the npm package. Install `permix`, then run:

```bash
pnpm dlx @tanstack/intent@latest install
```

Skills are indexed on the [Agent Skills Registry](https://tanstack.com/intent/registry) and update when you update the package.

## Changelog

Release notes are in [CHANGELOG.md](CHANGELOG.md) and on the docs site at [permix.letstri.dev/docs/changelog](https://permix.letstri.dev/docs/changelog).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

MIT License - see the [LICENSE](https://github.com/letstri/permix/blob/main/LICENSE) file for details
