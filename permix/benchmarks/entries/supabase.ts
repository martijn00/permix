import { createSupabaseClaimsAdapter } from 'permix/supabase'

export const adapter = createSupabaseClaimsAdapter<{ post: ['read'] }, object>({
  client: {
    auth: {
      getClaims: async () => ({ data: { claims: {} }, error: null }),
    },
  },
  resolveRules: () => ({ post: { read: true } }),
})
