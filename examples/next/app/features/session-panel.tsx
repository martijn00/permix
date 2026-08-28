import { getDemoRole, getSession } from '@/lib/auth'

import { RoleSwitcher } from '../components/role-switcher'

export async function SessionPanel() {
  const [session, role] = await Promise.all([getSession(), getDemoRole()])

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">Current session</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {session ? session.label : 'Signed out (guest)'}
          </p>
        </div>
        <RoleSwitcher currentRole={role} />
      </div>
    </section>
  )
}

export function SessionPanelSkeleton() {
  return (
    <section className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
  )
}
