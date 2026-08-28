import type {
  DocumentByName,
  GenericDataModel,
  GenericDocument,
  TableNamesInDataModel,
  WithoutSystemFields,
} from 'convex/server'

export type ConvexTableNames<DataModel extends GenericDataModel> =
  TableNamesInDataModel<DataModel>

export type ConvexTableSelection<DataModel extends GenericDataModel> =
  readonly ConvexTableNames<DataModel>[]

type DocumentId<Document> = Document extends {
  readonly _id: infer Id
}
  ? Id
  : never

type ConvexTableActions<Document extends GenericDocument> = readonly [
  {
    readonly name: 'get'
    readonly type: DocumentId<Document>
    readonly required: true
  },
  {
    readonly name: 'insert'
    readonly type: WithoutSystemFields<Document>
    readonly required: true
  },
  {
    readonly name: 'patch'
    readonly type: {
      readonly id: DocumentId<Document>
      readonly value: Partial<WithoutSystemFields<Document>>
    }
    readonly required: true
  },
  {
    readonly name: 'replace'
    readonly type: {
      readonly id: DocumentId<Document>
      readonly value: WithoutSystemFields<Document>
    }
    readonly required: true
  },
  {
    readonly name: 'delete'
    readonly type: DocumentId<Document>
    readonly required: true
  },
]

/**
 * A Permix Definition inferred from selected generated Convex table types.
 *
 * The action names and payloads mirror the unambiguous document operations on
 * Convex's generated database API. Query-specific business permissions remain
 * explicit application definitions.
 */
export type ConvexDefinition<
  DataModel extends GenericDataModel,
  Selection extends ConvexTableSelection<DataModel>,
> = {
  readonly [Table in Selection[number]]: ConvexTableActions<
    DocumentByName<DataModel, Table>
  >
}

/**
 * Preserves a literal table selection while checking it against DataModel.
 */
export function defineConvexTableSelection<
  DataModel extends GenericDataModel,
>() {
  return <const Selection extends ConvexTableSelection<DataModel>>(
    selection: Selection
  ): Selection => selection
}
