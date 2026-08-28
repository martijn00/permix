import { permix } from '@/lib/permix'

import { PermissionBadge } from '../components/permission-badge'

export function SyncReadBadge() {
  const instance = permix.usePermix()

  return (
    <PermissionBadge
      label="usePermix() post.read"
      allowed={instance.check('post.read')}
    />
  )
}
