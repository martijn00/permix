import { createPermix } from 'permix/react'

import type { PermissionsDefinition } from '@/shared/permix'

export const { permix, PermixProvider, usePermix, Check } =
  createPermix<PermissionsDefinition>()
