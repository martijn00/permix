import {
  createSupabaseClaimsAdapter,
  createSupabasePolicyManifest,
  defineSupabaseSelection,
} from 'permix/supabase'
import type {
  CreateSupabaseClaimsAdapterOptions,
  SupabaseDefinition,
} from 'permix/supabase'

type Database = {
  public: {
    Tables: {
      notes: {
        Row: { id: string; owner_id: string }
        Insert: { id?: string; owner_id: string }
        Update: { owner_id?: string }
      }
    }
    Views: {
      note_counts: {
        Row: { owner_id: string; total: number }
      }
    }
  }
}

type Claims = {
  sub: string
  app_metadata: { permissions: string[] }
  user_metadata: { elevated?: boolean }
}

const selection = defineSupabaseSelection<Database>()({
  public: {
    tables: ['notes'],
    views: ['note_counts'],
  },
} as const)

type Definition = SupabaseDefinition<Database, typeof selection>

declare const options: CreateSupabaseClaimsAdapterOptions<
  Definition,
  Claims,
  string
>

const adapter = createSupabaseClaimsAdapter(options)
const manifest = createSupabasePolicyManifest<Definition>({
  'public.tables.notes.select': {
    schema: 'public',
    relation: 'notes',
    relationType: 'table',
    operation: 'select',
  },
})

adapter.check('Bearer token', 'public.tables.notes.select', {
  id: 'note-1',
  owner_id: 'user-1',
})

// @ts-expect-error Selected operation payloads are required.
adapter.check('Bearer token', 'public.tables.notes.select')

adapter.resolve('Bearer token').then(
  ({ principal }) =>
    // @ts-expect-error User-controlled authorization metadata is not exposed.
    principal.claims.user_metadata
)

export { adapter, manifest, selection }
