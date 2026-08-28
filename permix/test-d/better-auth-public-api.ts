import { createAuthClient } from 'better-auth/client'
import { createAccessControl } from 'better-auth/plugins/access'
import type { DehydratedState } from 'permix'
import {
  createBetterAuthPermixClient,
  createBetterAuthPermixPlugin,
  inferDefinitionFromAccessControl,
  rulesFromBetterAuthRole,
} from 'permix/better-auth'
import type {
  BetterAuthSession,
  DefinitionFromAccessControl,
} from 'permix/better-auth'

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

type Session = BetterAuthSession & {
  user: BetterAuthSession['user'] & {
    role: 'admin' | 'member'
  }
}

const plugin = createBetterAuthPermixPlugin<Definition, Session>({
  resolveRules: (session) => ({
    documents: {
      read: true,
      update: ({ ownerId }) =>
        session.user.role === 'admin' || session.user.id === ownerId,
    },
  }),
})

const client = createAuthClient({
  plugins: [createBetterAuthPermixClient<typeof plugin>()],
})

type PermissionsResponse = Awaited<
  ReturnType<typeof client.permix.getPermissions>
>
type Permissions = PermissionsResponse['data']
type ExpectedPermissions = DehydratedState<Definition> | null
type PermissionsAreExact = [Permissions] extends [ExpectedPermissions]
  ? [ExpectedPermissions] extends [Permissions]
    ? true
    : false
  : false

const permissions: Permissions = null as ExpectedPermissions
const exactPermissions = true satisfies PermissionsAreExact

const access = createAccessControl({
  documents: ['read', 'update'],
} as const)
const member = access.newRole({ documents: ['read'] })
const inferred = inferDefinitionFromAccessControl(access.statements)
const roleRules = rulesFromBetterAuthRole(access.statements, member)

type InferredDefinition = DefinitionFromAccessControl<typeof access.statements>

plugin.checkSession(null, 'documents.update', { ownerId: 'user-1' })

// @ts-expect-error documents.update requires entity data.
plugin.checkSession(null, 'documents.update')

export {
  client,
  exactPermissions,
  inferred,
  member,
  permissions,
  plugin,
  roleRules,
}
export type { InferredDefinition, Permissions }
