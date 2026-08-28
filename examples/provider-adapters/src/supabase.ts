import {
  createSupabaseClaimsAdapter,
  createSupabasePolicyManifest,
  defineSupabaseSelection,
} from 'permix/supabase'
import type { SupabaseDefinition } from 'permix/supabase'

import type { PermissionDefinition } from './definition'

interface Claims {
  sub: string
  app_metadata: { permissions: string[] }
}

const client = {
  auth: {
    getClaims: async (token: string) => ({
      data: {
        claims: {
          sub: token,
          app_metadata: { permissions: ['documents.read'] },
        },
      },
      error: null,
    }),
  },
}

export const supabasePermix = createSupabaseClaimsAdapter<
  PermissionDefinition,
  Claims
>({
  client,
  resolveRules: ({ principal }) => ({
    documents: {
      read: principal.claims.app_metadata.permissions.includes(
        'documents.read'
      ),
      update: ({ ownerId }) => ownerId === principal.claims.sub,
    },
  }),
})

interface Database {
  public: {
    Tables: {
      documents: {
        Row: { id: string; owner_id: string }
        Insert: { id?: string; owner_id: string }
        Update: { owner_id?: string }
      }
    }
    Views: Record<never, never>
  }
}

export const supabaseSelection = defineSupabaseSelection<Database>()({
  public: { tables: ['documents'] },
} as const)

type DatabaseDefinition = SupabaseDefinition<Database, typeof supabaseSelection>

export const supabasePolicyManifest =
  createSupabasePolicyManifest<DatabaseDefinition>({
    'public.tables.documents.select': {
      schema: 'public',
      relation: 'documents',
      relationType: 'table',
      operation: 'select',
    },
  })
