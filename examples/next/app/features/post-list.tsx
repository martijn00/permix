import Link from 'next/link'
import { Suspense } from 'react'

import { permix } from '@/lib/permix'
import type { Post } from '@/lib/permix'
import { getPosts } from '@/lib/posts'

import { CreatePostForm } from '../components/create-post-form'
import { PermissionBadge } from '../components/permission-badge'
import { PrivateEditIsland, PrivateEditIslandSkeleton } from './private-edit'

export async function PostList() {
  const [posts, canCreate] = await Promise.all([
    getPosts(),
    permix.check('post.create'),
  ])

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">Posts</h2>
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-base font-medium">Post {post.id}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                authorId: {post.authorId}
              </p>
              <div className="flex flex-wrap gap-2">
                <PostUpdateBadge post={post} />
                <PostDeleteBadge post={post} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/posts/${post.id}`}
                prefetch
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Open page
              </Link>
              <Suspense fallback={<PrivateEditIslandSkeleton />}>
                <PrivateEditIsland postId={post.id} />
              </Suspense>
            </div>
          </div>
        </article>
      ))}
      <CreatePostForm canCreate={canCreate} />
    </section>
  )
}

async function PostUpdateBadge({ post }: { post: Post }) {
  const allowed = await permix.check('post.update', post)
  return <PermissionBadge label="server: post.update" allowed={allowed} />
}

async function PostDeleteBadge({ post }: { post: Post }) {
  const allowed = await permix.check('post.delete', post)
  return <PermissionBadge label="server: post.delete" allowed={allowed} />
}

export function PostListSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-7 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
    </section>
  )
}
