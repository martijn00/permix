import type { ReactNode } from 'react'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header data-testid="app-shell">Permix Next fixture</header>
        {children}
      </body>
    </html>
  )
}
