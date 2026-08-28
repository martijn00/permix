import {
  createPdpClient,
  createPdpHandler,
  createPdpOpenApiDocument,
} from 'permix/pdp'

import type { PermissionDefinition } from './definition'

export const pdpHandler = createPdpHandler<
  PermissionDefinition,
  string,
  { trusted: true }
>({
  authenticateCaller: () => 'user-1',
  authenticateService: (request) =>
    request.headers.get('authorization') === 'Bearer service-token'
      ? { trusted: true }
      : null,
  resolveSubject: ({ subject }) => subject,
  resolveRules: ({ principal }) => ({
    documents: {
      read: true,
      update: ({ ownerId }) => ownerId === principal,
    },
  }),
})

export const pdpClient = createPdpClient<PermissionDefinition>({
  baseUrl: 'https://permissions.example',
  fetch: (input, init) => pdpHandler(new Request(input, init)),
})

export const pdpOpenApiDocument = createPdpOpenApiDocument()
