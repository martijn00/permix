import { Suspense } from 'react'

import { ActionCheck } from './features/action-check'
import { ConcurrentInstances } from './features/concurrent-instances'
import { PublicRead } from './features/public-read'
import { SessionCreate } from './features/session-create'
import { UsePermixCreate } from './features/use-permix-create'

export default function Home() {
  return (
    <main>
      <Suspense fallback={<p data-testid="public-fallback">loading public</p>}>
        <PublicRead />
      </Suspense>
      <Suspense
        fallback={<p data-testid="concurrent-fallback">loading instances</p>}
      >
        <ConcurrentInstances />
      </Suspense>
      <Suspense
        fallback={<p data-testid="session-fallback">loading session</p>}
      >
        <SessionCreate />
      </Suspense>
      <Suspense
        fallback={<p data-testid="use-permix-fallback">loading usePermix</p>}
      >
        <UsePermixCreate />
      </Suspense>
      <ActionCheck />
    </main>
  )
}
