import type { DehydratedState } from 'permix'
import { useLayoutEffect } from 'react'

import type { Session } from '@/lib/auth'
import {
  clientPermix,
  PermixHydrate,
  PermixProvider,
} from '@/lib/client-permix'
import type { PermissionsDefinition } from '@/lib/permix'
import { createClientRules } from '@/lib/permix'

function ClientRulesSetup({
  state,
  session,
  children,
}: {
  state: DehydratedState<PermissionsDefinition>
  session: Session | null
  children: React.ReactNode
}) {
  useLayoutEffect(() => {
    clientPermix.install({ rules: createClientRules(session) })
  }, [state, session])

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
        <ClientRulesSetup state={state} session={session}>
          {children}
        </ClientRulesSetup>
      </PermixHydrate>
    </PermixProvider>
  )
}
