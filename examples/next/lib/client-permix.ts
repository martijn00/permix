import { createPermix } from 'permix/react'

import type { PermissionsDefinition } from './permissions'

export const {
  permix: clientPermix,
  PermixProvider,
  PermixHydrate,
  usePermix,
  Check,
} = createPermix<PermissionsDefinition>()
