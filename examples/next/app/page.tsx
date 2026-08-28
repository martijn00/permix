import { Suspense } from 'react'

import { PostList, PostListSkeleton } from './features/post-list'
import { PublicReadBadge } from './features/public-read-badge'
import { ServerChecks, ServerChecksSkeleton } from './features/server-checks'
import { SessionPanel, SessionPanelSkeleton } from './features/session-panel'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="space-y-3" data-testid="app-shell">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Permix + Next.js App Router
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Request-safe permissions demo
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          This example mirrors the{' '}
          <a
            href="https://permix.letstri.dev/docs/integrations/next"
            className="font-medium underline underline-offset-4"
          >
            Next.js integration guide
          </a>
          . A rules resolver initializes one cached instance per request. Static
          chrome stays in the App Shell; session-aware checks stream behind
          Suspense.
        </p>
        <Suspense fallback={null}>
          <PublicReadBadge />
        </Suspense>
      </header>

      <Suspense fallback={<SessionPanelSkeleton />}>
        <SessionPanel />
      </Suspense>

      <Suspense fallback={<ServerChecksSkeleton />}>
        <ServerChecks />
      </Suspense>

      <Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </Suspense>
    </main>
  )
}
