import { createPermix } from 'permix/nuxt'

export const permissions = createPermix<{ post: ['read'] }>()
