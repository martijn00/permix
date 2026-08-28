import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  WithoutSystemFields,
} from 'convex/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { describe, expectTypeOf, it } from 'vitest'

import type { DataAtPath, Definition, RulesPaths } from '../core'
import { defineConvexTableSelection } from './index'
import type {
  ConvexDefinition,
  ConvexTableNames,
  ConvexTableSelection,
} from './index'

const schema = defineSchema({
  documents: defineTable({
    ownerId: v.string(),
    title: v.string(),
  }),
  profiles: defineTable({
    handle: v.string(),
  }),
})

type DataModel = DataModelFromSchemaDefinition<typeof schema>
const selection = defineConvexTableSelection<DataModel>()([
  'documents',
] as const)
type InferredDefinition = ConvexDefinition<DataModel, typeof selection>
type Document = DocumentByName<DataModel, 'documents'>
type Insert = WithoutSystemFields<Document>

describe('Convex DataModel inference', () => {
  it('selects generated tables explicitly', () => {
    expectTypeOf<typeof selection>().toMatchTypeOf<
      ConvexTableSelection<DataModel>
    >()
    expectTypeOf<ConvexTableNames<DataModel>>().toEqualTypeOf<
      'documents' | 'profiles'
    >()
    expectTypeOf<InferredDefinition>().toMatchTypeOf<Definition>()
    expectTypeOf<RulesPaths<InferredDefinition>>().toEqualTypeOf<
      | 'documents.delete'
      | 'documents.get'
      | 'documents.insert'
      | 'documents.patch'
      | 'documents.replace'
    >()
  })

  it('mirrors unambiguous generated document operation payloads', () => {
    expectTypeOf<
      DataAtPath<InferredDefinition, 'documents.get'>
    >().toEqualTypeOf<[Document['_id']]>()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'documents.insert'>
    >().toEqualTypeOf<[Insert]>()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'documents.patch'>
    >().toEqualTypeOf<
      [
        {
          readonly id: Document['_id']
          readonly value: Partial<Insert>
        },
      ]
    >()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'documents.replace'>
    >().toEqualTypeOf<
      [
        {
          readonly id: Document['_id']
          readonly value: Insert
        },
      ]
    >()
    expectTypeOf<
      DataAtPath<InferredDefinition, 'documents.delete'>
    >().toEqualTypeOf<[Document['_id']]>()
  })

  it('rejects unknown or unselected tables', () => {
    const invalidSelection = () =>
      defineConvexTableSelection<DataModel>()([
        // @ts-expect-error Unknown table names are rejected.
        'missing',
      ])
    expectTypeOf(invalidSelection).toBeFunction()

    expectTypeOf<
      RulesPaths<InferredDefinition>
    >().not.toEqualTypeOf<'profiles.get'>()
  })
})
