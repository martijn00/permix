# HTTP PDP (`permix/pdp`)

Docs: https://permix.letstri.dev/docs/integrations/pdp Example: https://github.com/letstri/permix/tree/main/examples/provider-adapters

Stateless fetch-standard policy decision point: `createPdpHandler` + `createPdpClient`, plus a deterministic OpenAPI 3.1 document.

The server authenticates every request, resolves fresh rules, and creates an isolated instance. A `PermissionCatalog` is optional metadata and is **never required to authorize**.

```ts
import { createPdpHandler } from 'permix/pdp'

const handler = createPdpHandler<Definition, Caller, Service>({
  authenticateCaller: async (request) => verifyUserToken(request),
  authenticateService: async (request) => verifyServiceCredential(request),
  resolveSubject: ({ service, subject }) =>
    service.canImpersonate ? loadCaller(subject) : null,
  resolveRules: async ({ principal }) => ({
    document: { read: true, create: false },
  }),
})

export const POST = handler
```

Caller mode derives identity from the caller credential. Service mode may name a subject **only after** `authenticateService` succeeds. Never forward an untrusted body subject into `resolveRules`.

Shared kernel: `createAdapter` from `permix/adapter`.
