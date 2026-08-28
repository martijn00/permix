# Clerk (`permix/clerk`)

Docs: https://permix.letstri.dev/docs/integrations/clerk

Not a Clerk-native plugin. `createClerkPermix` authenticates a request (or accepts an already-authenticated `Auth` object) and resolves isolated rules.

```ts
import {
  createClerkPermix,
  createClerkRequestAuthenticator,
} from 'permix/clerk'
import { clerkClient } from '@clerk/nextjs/server'

const permissions = createClerkPermix<Definition>({
  authenticateRequest: createClerkRequestAuthenticator(clerkClient),
  resolveRules: async (principal) => ({
    documents: {
      read: principal.orgId !== undefined,
      update: ({ ownerId }) => ownerId === principal.userId,
    },
  }),
})
```

`permix/clerk/next` is only a thin `auth()` convenience. Organization checks require an **active organization**. Prefer an explicit bearer token when org context matters. Dehydrated permissions are UX only — [security.md](security.md).
