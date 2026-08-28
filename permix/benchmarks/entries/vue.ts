import { createPermix } from 'permix/vue'

export const bindings = createPermix<{ post: ['read'] }>()
bindings.permix.setup({ post: { read: true } })
