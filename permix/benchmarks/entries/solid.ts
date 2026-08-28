import { createPermix } from 'permix'
import { createComponents } from 'permix/solid'

export { PermixProvider, usePermix } from 'permix/solid'

const permissions = createPermix<{ post: ['read'] }>({
  post: { read: true },
})

export const components = createComponents(permissions)
