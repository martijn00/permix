import { describe, expectTypeOf, it } from 'vitest'

import type { DataAtPath, Definition, RulesPaths } from '../core'
import { defineSupabaseSelection } from './index'
import type {
  SupabaseDefinition,
  SupabaseSelection,
  SupabaseTableNames,
  SupabaseViewNames,
} from './index'

interface Database {
  public: {
    Tables: {
      documents: {
        Row: { id: string; owner_id: string; title: string }
        Insert: { id?: string; owner_id: string; title: string }
        Update: { owner_id?: string; title?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; handle: string }
        Insert: { id: string; handle: string }
        Update: { handle?: string }
        Relationships: []
      }
    }
    Views: {
      published_documents: {
        Row: { id: string; title: string }
        Relationships: []
      }
    }
  }
  audit: {
    Tables: {
      events: {
        Row: { id: number; actor_id: string }
        Insert: { actor_id: string }
        Update: { actor_id?: string }
        Relationships: []
      }
    }
    Views: {
      event_summary: {
        Row: { actor_id: string; total: number }
        Relationships: []
      }
    }
  }
}

const selection = defineSupabaseSelection<Database>()({
  public: {
    tables: ['documents', 'profiles'],
    views: ['published_documents'],
  },
  audit: {
    tables: ['events'],
    views: ['event_summary'],
  },
} as const)

type Selection = typeof selection
type InferredDefinition = SupabaseDefinition<Database, Selection>

describe('Supabase Database inference', () => {
  it('selects tables and views explicitly across schemas', () => {
    expectTypeOf<Selection>().toMatchTypeOf<SupabaseSelection<Database>>()
    expectTypeOf<SupabaseTableNames<Database, 'public'>>().toEqualTypeOf<
      'documents' | 'profiles'
    >()
    expectTypeOf<
      SupabaseViewNames<Database, 'audit'>
    >().toEqualTypeOf<'event_summary'>()
    expectTypeOf<InferredDefinition>().toMatchTypeOf<Definition>()
    expectTypeOf<RulesPaths<InferredDefinition>>().toEqualTypeOf<
      | 'audit.tables.events.delete'
      | 'audit.tables.events.insert'
      | 'audit.tables.events.select'
      | 'audit.tables.events.update'
      | 'audit.views.event_summary.select'
      | 'public.tables.documents.delete'
      | 'public.tables.documents.insert'
      | 'public.tables.documents.select'
      | 'public.tables.documents.update'
      | 'public.tables.profiles.delete'
      | 'public.tables.profiles.insert'
      | 'public.tables.profiles.select'
      | 'public.tables.profiles.update'
      | 'public.views.published_documents.select'
    >()
  })

  it('uses generated Row, Insert, and Update payloads as required data', () => {
    expectTypeOf<
      DataAtPath<InferredDefinition, 'public.tables.documents.select'>
    >().toEqualTypeOf<[{ id: string; owner_id: string; title: string }]>()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'public.tables.documents.insert'>
    >().toEqualTypeOf<[{ id?: string; owner_id: string; title: string }]>()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'public.tables.documents.update'>
    >().toEqualTypeOf<[{ owner_id?: string; title?: string }]>()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'public.tables.documents.delete'>
    >().toEqualTypeOf<[{ id: string; owner_id: string; title: string }]>()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'audit.views.event_summary.select'>
    >().toEqualTypeOf<[{ actor_id: string; total: number }]>()
  })

  it('rejects unselected or unknown generated entities', () => {
    const invalidSelection = () =>
      defineSupabaseSelection<Database>()({
        public: {
          // @ts-expect-error Unknown table names are rejected.
          tables: ['missing'],
        },
      })
    expectTypeOf(invalidSelection).toBeFunction()

    type DocumentsOnly = SupabaseDefinition<
      Database,
      { public: { tables: ['documents'] } }
    >
    expectTypeOf<
      RulesPaths<DocumentsOnly>
    >().not.toEqualTypeOf<'public.tables.profiles.select'>()
  })
})
