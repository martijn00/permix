import { createPdpClient, createPdpHandler } from 'permix/pdp'

export const handler = createPdpHandler<{ post: ['read'] }, string, string>({
  authenticateCaller: () => 'caller',
  authenticateService: () => 'service',
  resolveSubject: ({ subject }) => subject,
  resolveRules: () => ({ post: { read: true } }),
})

export const client = createPdpClient<{ post: ['read'] }>()
