import { usePermix } from 'permix/react'

import { permix } from '../lib/permix'

export function usePermissions() {
  return usePermix(permix)
}
