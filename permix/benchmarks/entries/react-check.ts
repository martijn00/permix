import { createPermix } from 'permix'
import { createComponents } from 'permix/react'

export { PermixProvider } from 'permix/react'

const permissions = createPermix<{ post: ['read'] }>({
  post: { read: true },
})

export const { Check } = createComponents(permissions)
