import { createPermix } from 'permix'

import { getSession } from '@/lib/auth'
import type { PermissionsDefinition } from '@/lib/permissions'
import { rulesForSession } from '@/lib/permissions'
import { permix } from '@/lib/permix'
import { getPost } from '@/lib/posts'

import { EditButton } from '../posts/[id]/edit-button'
import { Providers } from '../providers'

async function readPostUpdatePayload(postId: string) {
  'use cache: private'
  const session = await getSession()
  const instance = createPermix<PermissionsDefinition>()
  instance.setup(rulesForSession(session))
  const post = await getPost(postId)
  if (!post || !instance.check('post.update', post)) {
    return null
  }
  return { id: post.id, authorId: post.authorId }
}

export async function PrivateEditIsland({ postId }: { postId: string }) {
  const payload = await readPostUpdatePayload(postId)
  if (!payload) {
    return null
  }

  const [state, session] = await Promise.all([permix.dehydrate(), getSession()])

  return (
    <Providers state={state} session={session}>
      <EditButton post={payload} />
    </Providers>
  )
}

export function PrivateEditIslandSkeleton() {
  return (
    <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
  )
}
