import { createPermix } from 'permix'
import { PermixProvider, providePermix, usePermix } from 'permix/svelte'

export const permissions = createPermix<{ post: ['read'] }>({
  post: { read: true },
})
export const svelteBindings = { PermixProvider, providePermix, usePermix }
