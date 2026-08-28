import { permix } from '../../lib/permix'

export async function SessionCreate() {
  const allowed = await permix.check('post.create')
  return (
    <span data-testid="session-create">{allowed ? 'allowed' : 'denied'}</span>
  )
}
