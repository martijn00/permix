import { createPermix } from 'permix/solid'

export const bindings = createPermix<{ post: ['read'] }>()
bindings.permix.setup({ post: { read: true } })
