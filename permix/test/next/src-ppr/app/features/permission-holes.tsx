import { Suspense } from 'react'

import { PrivateEdit } from './private-edit'
import { SessionIsland } from './session-island'

export function PermissionHoles() {
  return (
    <>
      <Suspense
        fallback={<p data-testid="session-island-fallback">loading session</p>}
      >
        <SessionIsland />
      </Suspense>
      <Suspense
        fallback={<p data-testid="private-edit-fallback">loading private</p>}
      >
        <PrivateEdit />
      </Suspense>
    </>
  )
}
