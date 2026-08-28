import { publicPermix } from '../../lib/permix'

export async function PublicRead() {
  const allowed = await publicPermix.check('post.read')
  return <span data-testid="public-read">{allowed ? 'allowed' : 'denied'}</span>
}
