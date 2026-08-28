# Better Auth (`permix/better-auth`)

Docs: https://permix.letstri.dev/docs/integrations/better-auth

Native server/client plugin pair. Each plugin captures its own `resolveRules`, so concurrent users do not share mutable permission state.

```ts
import { createBetterAuthPermixPlugin } from 'permix/better-auth'

export const permixPlugin = createBetterAuthPermixPlugin<Definition>({
  resolveRules: async (session) => ({
    documents: {
      read: true,
      update: ({ ownerId }) => ownerId === session.user.id,
    },
  }),
})

export const auth = betterAuth({ plugins: [permixPlugin] })
```

Pair with `createBetterAuthPermixClient` on the auth client. Dehydrated permissions are UX only — still authenticate endpoints and enforce on the server — [security.md](security.md).

v3 `permixPlugin` / `permixClient` / `permix/better-auth` session helpers were removed in v4; this is the v4 provider API.
