import { createPermix } from 'permix'

export {
  PermixProvider as Provider,
  usePermix as usePermissions,
} from 'permix/react'

export const permissions = createPermix<{ post: ['read'] }>({
  post: { read: true },
})
