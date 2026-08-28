'use server'

import { createPermix } from 'permix'

import { getUser } from '../lib/auth'
import type { PostDefinition } from '../lib/permix'
import { rulesForUser } from '../lib/permix'

export async function checkCreate() {
  const permix = createPermix<PostDefinition>()
  permix.setup(rulesForUser(await getUser()))
  return permix.check('post.create')
}
