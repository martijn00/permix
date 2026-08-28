# Convex (`permix/convex`)

Docs: https://permix.letstri.dev/docs/integrations/convex

Wrap generated Convex builders. Every invocation calls `ctx.auth.getUserIdentity()`, resolves rules, injects an isolated `permix` instance, then runs the handler.

```ts
import { createConvexPermix } from 'permix/convex'
import type { DataModel } from './_generated/dataModel'

export const permissions = createConvexPermix<Definition, DataModel>({
  resolveRules: async ({ identity }) => ({
    documents: {
      read: true,
      update: ({ ownerId }) => ownerId === identity.subject,
    },
  }),
})
```

The resolver receives `kind` (`query` | `mutation` | `action` | `httpAction`), context, and args. Optional `ConvexDefinition` / `defineConvexTableSelection` infer from the generated data model. Still check inside handlers with the injected instance — wrapping is not a substitute for skipping identity.
