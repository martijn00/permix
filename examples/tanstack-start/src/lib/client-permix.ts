import { createPermix } from 'permix/react'

import type { PermissionsDefinition } from '@/lib/permix'

export const {
  permix: clientPermix,
  PermixProvider,
  PermixHydrate,
  usePermix,
} = createPermix<PermissionsDefinition>()
