import { tenant } from 'next/root-params'

import { tenantPermix } from '../../lib/tenant-permix'

export async function CacheSafeCheck() {
  const current = await tenant()
  const canCreate = await tenantPermix.check('post.create')
  return (
    <span data-testid="cache-safe-check">
      {current}:{canCreate ? 'create-allowed' : 'create-denied'}
    </span>
  )
}
