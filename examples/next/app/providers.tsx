'use client'

import type { DehydratedState } from 'permix'
import { useLayoutEffect } from 'react'

import type { Session } from '@/lib/auth'
import {
  clientPermix,
  PermixHydrate,
  PermixProvider,
} from '@/lib/client-permix'
import { rulesForSession } from '@/lib/permissions'
import type { PermissionsDefinition } from '@/lib/permissions'

function ClientRulesSetup({
  session,
  children,
}: {
  session: Session | null
  children: React.ReactNode
}) {
  useLayoutEffect(() => {
    clientPermix.setup(rulesForSession(session))
  }, [session])

  return children
}

export function Providers({
  state,
  session,
  children,
}: {
  state: DehydratedState<PermissionsDefinition>
  session: Session | null
  children: React.ReactNode
}) {
  return (
    <PermixProvider>
      <PermixHydrate state={state}>
        <ClientRulesSetup session={session}>{children}</ClientRulesSetup>
      </PermixHydrate>
    </PermixProvider>
  )
}
