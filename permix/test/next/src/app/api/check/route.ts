import { createPermix } from 'permix'

import { getUser } from '../../../lib/auth'
import type { PostDefinition } from '../../../lib/permix'
import { rulesForUser } from '../../../lib/permix'

export async function GET() {
  const permix = createPermix<PostDefinition>()
  permix.setup(rulesForUser(await getUser()))
  return Response.json({
    create: permix.check('post.create'),
    read: permix.check('post.read'),
  })
}
