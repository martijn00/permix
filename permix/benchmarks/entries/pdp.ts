import { createPdpHandler } from 'permix/pdp'

export const handler = createPdpHandler<{ post: ['read'] }, string, string>({
  authenticateCaller: async () => 'user',
  authenticateService: async () => 'service',
  resolveSubject: async () => 'user',
  resolveRules: () => ({ post: { read: true } }),
})
