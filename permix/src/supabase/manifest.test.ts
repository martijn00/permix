import { describe, expect, expectTypeOf, it } from 'vitest'

import { createSupabasePolicyManifest, defineSupabaseSelection } from './index'
import type { SupabaseDefinition, SupabasePolicyManifestInput } from './index'

interface Database {
  public: {
    Tables: {
      documents: {
        Row: { id: string }
        Insert: { id?: string }
        Update: { id?: string }
      }
    }
    Views: {
      document_summary: {
        Row: { total: number }
      }
    }
  }
}

const selection = defineSupabaseSelection<Database>()({
  public: {
    tables: ['documents'],
    views: ['document_summary'],
  },
} as const)

type GeneratedDefinition = SupabaseDefinition<Database, typeof selection>

const operations = {
  'public.tables.documents.select': {
    schema: 'public',
    relation: 'documents',
    relationType: 'table',
    operation: 'select',
  },
  'public.tables.documents.update': {
    schema: 'public',
    relation: 'documents',
    relationType: 'table',
    operation: 'update',
  },
  'public.views.document_summary.select': {
    schema: 'public',
    relation: 'document_summary',
    relationType: 'view',
    operation: 'select',
  },
} as const satisfies SupabasePolicyManifestInput<GeneratedDefinition>

describe(createSupabasePolicyManifest, () => {
  it('keeps canonical operation mappings and reports catalog coverage', () => {
    const manifest = createSupabasePolicyManifest<GeneratedDefinition>(
      operations,
      {
        catalog: {
          schemaVersion: 1,
          permissions: [
            {
              key: 'public.tables.documents.select',
              references: [],
            },
            {
              key: 'public.tables.documents.insert',
              references: [],
            },
            {
              key: 'public.views.document_summary.select',
              references: [],
            },
          ],
        },
      }
    )

    expect(manifest.entries).toBe(operations)
    expect(manifest.keys).toStrictEqual([
      'public.tables.documents.select',
      'public.tables.documents.update',
      'public.views.document_summary.select',
    ])
    expect(manifest.coverage).toStrictEqual({
      valid: false,
      unknown: ['public.tables.documents.update'],
      uncovered: ['public.tables.documents.insert'],
    })
  })

  it('supports canonical manual definitions and optional catalogs', () => {
    // A type alias preserves concrete Definition keys without an index signature.
    // oxlint-disable-next-line typescript/consistent-type-definitions
    type ManualDefinition = {
      audit: ['view']
    }

    const manifest = createSupabasePolicyManifest<ManualDefinition>({
      'audit.view': {
        schema: 'private',
        relation: 'audit',
        relationType: 'table',
        operation: 'select',
      },
    })

    expect(manifest.coverage).toBeNull()
    expectTypeOf(manifest.entries).toMatchTypeOf<
      SupabasePolicyManifestInput<ManualDefinition>
    >()
  })

  it('rejects unknown paths and mismatched operation descriptors', () => {
    const unknownPath = () =>
      createSupabasePolicyManifest<GeneratedDefinition>({
        // @ts-expect-error Unknown definition path.
        'public.tables.missing.select': {
          schema: 'public',
          relation: 'missing',
          relationType: 'table',
          operation: 'select',
        },
      })
    const mismatchedOperation = () =>
      createSupabasePolicyManifest<GeneratedDefinition>({
        'public.tables.documents.select': {
          schema: 'public',
          relation: 'documents',
          relationType: 'table',
          // @ts-expect-error The descriptor must match its canonical path.
          operation: 'delete',
        },
      })
    const invalidViewOperation = {
      // @ts-expect-error Selected views only expose select.
      'public.views.document_summary.update': {
        schema: 'public',
        relation: 'document_summary',
        relationType: 'view',
        operation: 'update',
      },
    } satisfies SupabasePolicyManifestInput<GeneratedDefinition>

    expectTypeOf(unknownPath).toBeFunction()
    expectTypeOf(mismatchedOperation).toBeFunction()
    expectTypeOf(invalidViewOperation).toBeObject()
  })
})
