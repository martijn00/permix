import { tenant } from 'next/root-params'
import { createPermix } from 'permix/next'

import type { PostDefinition } from './permix'

export const tenantPermix = createPermix<PostDefinition>(async () => {
  const current = await tenant()
  return {
    post: {
      create: current === 'acme',
      read: true,
      update: false,
    },
  }
})
