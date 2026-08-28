import { createPermix } from 'permix/react'

export const bindings = createPermix<{ post: ['read'] }>()
bindings.permix.setup({ post: { read: true } })
