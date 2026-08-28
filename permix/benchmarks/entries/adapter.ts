import { createAdapter } from 'permix/adapter'

export const adapter = createAdapter<{ post: ['read'] }, string, string>({
  authenticate: (token) => token,
  resolveRules: () => ({ post: { read: true } }),
})
