import { createPermix } from 'permix'

import { getUser } from '../../lib/auth'
import type { PostDefinition } from '../../lib/permix'
import { rulesForUser } from '../../lib/permix'

async function readPrivateEditPayload() {
  'use cache: private'
  const user = await getUser()
  const permix = createPermix<PostDefinition>().setup(rulesForUser(user))
  if (!permix.check('post.update')) {
    return null
  }
  return { canEdit: true as const, user }
}

export async function PrivateEdit() {
  const payload = await readPrivateEditPayload()
  if (!payload) {
    return <span data-testid="private-edit">hidden</span>
  }
  return <span data-testid="private-edit">{payload.user}:edit-allowed</span>
}
