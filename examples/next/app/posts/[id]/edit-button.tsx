'use client'

import { usePermix } from '@/lib/client-permix'
import type { Post } from '@/lib/permissions'

export function EditButton({ post }: { post: Post }) {
  const { check } = usePermix()

  if (!check('post.update', post)) {
    return null
  }

  return (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      Edit post
    </button>
  )
}
