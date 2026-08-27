import { createMemo } from 'solid-js'

export interface Post {
  id: string
  authorId: string
}

const posts = [
  { id: '1', authorId: '1' },
  { id: '2', authorId: '2' },
]

export function usePosts() {
  return createMemo(() => posts)
}
