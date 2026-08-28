import { connection } from 'next/server'

import { permix } from '../../lib/permix'

export async function SessionIsland() {
  await connection()
  const allowed = await permix.check('post.create')
  return (
    <span data-testid="session-island">
      {allowed ? 'session-allowed' : 'session-denied'}
    </span>
  )
}
