import { createPermix } from 'permix/next'

import { getSession } from './auth'
import type { PermissionsDefinition } from './permissions'
import { publicReadTemplate, rulesForSession } from './permissions'

export const permix = createPermix<PermissionsDefinition>(async () =>
  rulesForSession(await getSession())
)

export const publicPermix = createPermix<PermissionsDefinition>(() =>
  publicReadTemplate()
)

export { adminTemplate, guestTemplate, rulesForSession } from './permissions'
export type { PermissionsDefinition, Post } from './permissions'
