import { createPermix } from 'permix'

import { getSession } from '@/lib/auth'
import type { PermissionsDefinition } from '@/lib/permissions'
import { rulesForSession } from '@/lib/permissions'

export async function POST() {
  const permix = createPermix<PermissionsDefinition>().setup(
    rulesForSession(await getSession())
  )

  if (!permix.check('post.create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  return Response.json({ ok: true, message: 'Post created (demo)' })
}
