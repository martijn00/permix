import { createBetterAuthPermixPlugin } from 'permix/better-auth'

export const plugin = createBetterAuthPermixPlugin<{ post: ['read'] }>({
  resolveRules: () => ({ post: { read: true } }),
})
