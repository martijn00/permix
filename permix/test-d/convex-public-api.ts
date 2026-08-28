import type { DataModelFromSchemaDefinition } from 'convex/server'
import { defineSchema, defineTable, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { createConvexPermix, defineConvexTableSelection } from 'permix/convex'
import type { ConvexDefinition, ConvexRuleContext } from 'permix/convex'

type Definition = {
  documents: [
    'read',
    {
      name: 'update'
      type: { ownerId: string }
      required: true
    },
  ]
}

const schema = defineSchema({
  documents: defineTable({
    ownerId: v.string(),
    title: v.string(),
  }),
})
type DataModel = DataModelFromSchemaDefinition<typeof schema>

const convex = createConvexPermix<Definition, DataModel>({
  resolveRules: ({ identity, kind }) => ({
    documents: {
      read: identity.subject.length > 0,
      update: ({ ownerId }) => kind === 'query' && ownerId === identity.subject,
    },
  }),
})

const getDocument = convex.query(queryGeneric)({
  args: { ownerId: v.string() },
  returns: v.boolean(),
  handler: ({ identity, permix }, args) =>
    permix.check('documents.update', {
      ownerId: args.ownerId || identity.subject,
    }),
})

const selection = defineConvexTableSelection<DataModel>()([
  'documents',
] as const)
type InferredDefinition = ConvexDefinition<DataModel, typeof selection>
type RuleContext = ConvexRuleContext<DataModel, typeof convex.$inferIdentity>

const inferredPath: keyof InferredDefinition = 'documents'
const kind: RuleContext['kind'] = 'mutation'

const invalidQuery = () =>
  convex.query(queryGeneric)({
    args: {},
    handler: ({ permix }) =>
      // @ts-expect-error documents.update requires entity data.
      permix.check('documents.update'),
  })

export { convex, getDocument, inferredPath, invalidQuery, kind, selection }
export type { InferredDefinition, RuleContext }
