import { createSupabaseClaimsAdapter } from 'permix/supabase'

export const adapter = createSupabaseClaimsAdapter<{ post: ['read'] }, object>({
  client: {
    auth: {
      getClaims: async () => ({ data: null, error: null }),
    },
  },
  resolveRules: () => ({ post: { read: true } }),
})
