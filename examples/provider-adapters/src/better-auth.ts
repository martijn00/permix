import {
  createBetterAuthPermixClient,
  createBetterAuthPermixPlugin,
} from 'permix/better-auth'

import type { ExampleSession, PermissionDefinition } from './definition'

export const betterAuthPermix = createBetterAuthPermixPlugin<
  PermissionDefinition,
  ExampleSession
>({
  resolveRules: (session) => ({
    documents: {
      read: true,
      update: ({ ownerId }) => ownerId === session.user.id,
    },
  }),
})

export const betterAuthPermixClient =
  createBetterAuthPermixClient<typeof betterAuthPermix>()
