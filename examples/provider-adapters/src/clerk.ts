import {
  createClerkAuthorizationMapping,
  createClerkPermissionsHandler,
  createClerkPermix,
  createClerkPermixClient,
} from 'permix/clerk'

import type { PermissionDefinition } from './definition'

export const clerkMapping =
  createClerkAuthorizationMapping<PermissionDefinition>({
    'documents.read': { permission: 'org:documents:read' },
    'documents.update': { role: 'org:editor' },
  })

export const clerkPermix = createClerkPermix<PermissionDefinition>({
  resolveRules: (principal) => ({
    documents: {
      read: clerkMapping.check(principal, 'documents.read'),
      update: ({ ownerId }) => ownerId === principal.userId,
    },
  }),
})

export const clerkPermissionsHandler =
  createClerkPermissionsHandler(clerkPermix)

export const clerkPermixClient = createClerkPermixClient<PermissionDefinition>({
  organizationId: 'org_example',
  getToken: async ({ organizationId } = {}) =>
    organizationId === undefined ? null : 'example-token',
})
