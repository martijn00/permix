import Link from 'next/link'
import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { CacheSafeCheck } from '../features/cache-safe-check'

export function generateStaticParams() {
  return [{ tenant: 'acme' }, { tenant: 'globex' }]
}

export default function TenantLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ tenant: string }>
}) {
  return (
    <html lang="en">
      <body>
        <header data-testid="app-shell">Permix Next fixture</header>
        <section>
          <nav data-testid="tenant-shell">
            {params.then(({ tenant }) => (
              <span data-testid="tenant-name">{tenant}</span>
            ))}
            <Link href="/acme" data-testid="acme-link">
              Acme
            </Link>
            <Link href="/globex" data-testid="globex-link">
              Globex
            </Link>
            <Link href="/acme/dashboard" data-testid="dashboard-link">
              Dashboard
            </Link>
            <Link
              href="/acme/dashboard"
              prefetch
              data-testid="dashboard-prefetch-link"
            >
              Dashboard (prefetch)
            </Link>
            <Link href="/globex" prefetch data-testid="globex-prefetch-link">
              Globex (prefetch)
            </Link>
          </nav>
          <Suspense
            fallback={
              <p data-testid="cache-safe-fallback">loading cache-safe</p>
            }
          >
            <CacheSafeCheck />
          </Suspense>
          {children}
        </section>
      </body>
    </html>
  )
}
