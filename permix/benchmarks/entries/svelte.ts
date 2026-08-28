import { createPermix } from 'permix/svelte'

export const bindings = createPermix<{ post: ['read'] }>()
bindings.permix.setup({ post: { read: true } })
