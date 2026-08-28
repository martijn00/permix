import { permix } from '@/lib/permix'
import { getPosts } from '@/lib/posts'

import { PermissionBadge } from '../components/permission-badge'
import { SyncReadBadge } from './sync-read-badge'

export async function ServerChecks() {
  const posts = await getPosts()
  const canCreate = await permix.check('post.create')
  const canRead = await permix.check('post.read', posts[0])

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Server checks in this request</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <PermissionBadge label="await check post.create" allowed={canCreate} />
        <PermissionBadge label="await check post.read" allowed={canRead} />
        <SyncReadBadge />
      </div>
    </section>
  )
}

export function ServerChecksSkeleton() {
  return (
    <section className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
  )
}
