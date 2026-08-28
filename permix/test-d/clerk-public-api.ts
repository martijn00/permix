import type { ClerkClient, SessionAuthObject } from '@clerk/backend'
import type { DehydratedState } from 'permix'
import {
  createClerkAuthorizationMapping,
  createClerkPermissionsHandler,
  createClerkPermix,
  createClerkPermixClient,
  createClerkRequestAuthenticator,
} from 'permix/clerk'
import type { ClerkPrincipal, ClerkSessionClaims } from 'permix/clerk'
import { createNextClerkPermix } from 'permix/clerk/next'

type Definition = {
  documents: [
    'read',
    {
      name: 'update'
      type: { ownerId: string }
      required: true
    },
  ]
}

type Claims = ClerkSessionClaims & {
  tenant: string
}

declare const authObject: SessionAuthObject
declare const clerkClient: Promise<ClerkClient>

const authenticateRequest = createClerkRequestAuthenticator(clerkClient)

const mapping = createClerkAuthorizationMapping<Definition>({
  'documents.read': { permission: 'org:documents:read' },
  'documents.update': { role: 'org:editor' },
})

const integration = createClerkPermix<Definition, Claims>({
  resolveRules(principal: ClerkPrincipal<Claims>) {
    return {
      documents: {
        read: mapping.check(principal, 'documents.read'),
        update: ({ ownerId }) => ownerId === principal.userId,
      },
    }
  },
})

const handler = createClerkPermissionsHandler(integration)
const client = createClerkPermixClient<Definition>({
  organizationId: 'org_123',
  getToken: async ({ organizationId } = {}) =>
    organizationId === undefined ? null : 'token',
})
const nextIntegration = createNextClerkPermix<Definition>({
  resolveRules: (principal) => ({
    documents: {
      read: principal.orgId !== undefined,
      update: ({ ownerId }) => ownerId === principal.userId,
    },
  }),
})

const permissions: Promise<DehydratedState<Definition>> =
  client.getPermissions()

integration.check(authObject, 'documents.update', { ownerId: 'user_1' })

// @ts-expect-error documents.update requires entity data.
integration.check(authObject, 'documents.update')

export {
  authenticateRequest,
  client,
  handler,
  integration,
  mapping,
  nextIntegration,
  permissions,
}
