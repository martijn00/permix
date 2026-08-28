import type { DataModelFromSchemaDefinition } from 'convex/server'
import { defineSchema, defineTable, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { createConvexPermix, defineConvexTableSelection } from 'permix/convex'
import type { ConvexDefinition } from 'permix/convex'

import type { PermissionDefinition } from './definition'

const schema = defineSchema({
  documents: defineTable({
    ownerId: v.string(),
    title: v.string(),
  }),
})

type DataModel = DataModelFromSchemaDefinition<typeof schema>

export const convexPermix = createConvexPermix<PermissionDefinition, DataModel>(
  {
    resolveRules: ({ identity }) => ({
      documents: {
        read: true,
        update: ({ ownerId }) => ownerId === identity.subject,
      },
    }),
  }
)

export const canUpdateDocument = convexPermix.query(queryGeneric)({
  args: { ownerId: v.string() },
  returns: v.boolean(),
  handler: ({ permix }, args) => permix.check('documents.update', args),
})

export const convexTables = defineConvexTableSelection<DataModel>()([
  'documents',
] as const)

export type DatabasePermissionDefinition = ConvexDefinition<
  DataModel,
  typeof convexTables
>
