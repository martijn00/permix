import { createPermix } from 'permix'
import { createComponents } from 'permix/vue'

export { PermixProvider, usePermix } from 'permix/vue'

const permissions = createPermix<{ post: ['read'] }>({
  post: { read: true },
})

export const components = createComponents(permissions)
