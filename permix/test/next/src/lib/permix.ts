import { createPermix } from 'permix/next'

import { getUser } from './auth'

export type PostDefinition = {
  post: ['create', 'read', 'update']
}

export function rulesForUser(user: 'alice' | 'bob') {
  return {
    post: {
      create: user === 'alice',
      read: true,
      update: user === 'alice',
    },
  } as const
}

export const permix = createPermix<PostDefinition>(async () =>
  rulesForUser(await getUser())
)

export const publicPermix = createPermix<PostDefinition>(() => ({
  post: {
    create: false,
    read: true,
    update: false,
  },
}))
