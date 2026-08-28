import { publicPermix } from '@/lib/permix'

import { PermissionBadge } from '../components/permission-badge'

export async function PublicReadBadge() {
  'use cache'
  const allowed = await publicPermix.check('post.read')

  return (
    <PermissionBadge label="post.read (public, cacheable)" allowed={allowed} />
  )
}
