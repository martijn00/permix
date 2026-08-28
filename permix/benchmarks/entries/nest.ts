import { createPermix } from 'permix/nest'

export const permissions = createPermix<{ post: ['read'] }>()
