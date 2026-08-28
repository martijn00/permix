# Supabase (`permix/supabase`)

Docs: https://permix.letstri.dev/docs/integrations/supabase

Three separate concerns:

1. Verify a bearer token and resolve per-request rules.
2. Infer a definition from generated `Database` tables/views (optional).
3. Map canonical paths to native Postgres RLS (`createSupabasePolicyManifest`).

**Permix does not replace RLS.** Enable RLS on every browser-accessible table.

```ts
import { createSupabaseClaimsAdapter } from 'permix/supabase'

const permissions = createSupabaseClaimsAdapter<Definition, Claims>({
  client: supabase,
  resolveRules: ({ principal }) => ({
    documents: {
      read: principal.claims.app_metadata.permissions.includes(
        'documents.read'
      ),
      update: ({ ownerId }) => ownerId === principal.claims.sub,
    },
  }),
})
```

Use `createSupabaseUserAdapter` when rules need a freshly fetched Auth user. The claims adapter does **not** treat user-controlled metadata as trusted authorization input. JWT authorization claims can be stale until refresh — [security.md](security.md).
