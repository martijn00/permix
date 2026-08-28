import './better-auth'
import './clerk'
import './convex'
import { pdpClient } from './pdp'
import { supabasePermix } from './supabase'

const [pdpDecision, supabaseDecision] = await Promise.all([
  pdpClient.check('documents.update', { ownerId: 'user-1' }),
  supabasePermix.check('Bearer user-1', 'documents.update', {
    ownerId: 'user-1',
  }),
])

console.log({
  pdpAllowed: pdpDecision.allowed,
  supabaseAllowed: supabaseDecision.allowed,
})
