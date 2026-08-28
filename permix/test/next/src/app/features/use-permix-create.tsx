import { permix } from '../../lib/permix'

export function UsePermixCreate() {
  const instance = permix.usePermix()
  return (
    <span data-testid="use-permix-create">
      {instance.check('post.create') ? 'allowed' : 'denied'}
    </span>
  )
}
