type SchemaNames<Database> = keyof Database & string

type SchemaAt<Database, Schema extends SchemaNames<Database>> = Database[Schema]

type TablesAt<Database, Schema extends SchemaNames<Database>> =
  SchemaAt<Database, Schema> extends {
    readonly Tables: infer Tables
  }
    ? Tables
    : never

type ViewsAt<Database, Schema extends SchemaNames<Database>> =
  SchemaAt<Database, Schema> extends {
    readonly Views: infer Views
  }
    ? Views
    : never

export type SupabaseTableNames<
  Database,
  Schema extends SchemaNames<Database>,
> = keyof TablesAt<Database, Schema> & string

export type SupabaseViewNames<
  Database,
  Schema extends SchemaNames<Database>,
> = keyof ViewsAt<Database, Schema> & string

export interface SupabaseSchemaSelection<
  Database,
  Schema extends SchemaNames<Database>,
> {
  readonly tables?: readonly SupabaseTableNames<Database, Schema>[]
  readonly views?: readonly SupabaseViewNames<Database, Schema>[]
}

/**
 * Explicit schema/entity selection used only for type inference. Nothing is
 * read from a generated module or a live Supabase project at runtime.
 */
export type SupabaseSelection<Database> = {
  readonly [Schema in SchemaNames<Database>]?: SupabaseSchemaSelection<
    Database,
    Schema
  >
}

type EntityRow<Entity> = Entity extends { readonly Row: infer Row }
  ? Row
  : never

type EntityInsert<Entity> = Entity extends { readonly Insert: infer Insert }
  ? Insert
  : never

type EntityUpdate<Entity> = Entity extends { readonly Update: infer Update }
  ? Update
  : never

type TableActions<Entity> = readonly [
  {
    readonly name: 'select'
    readonly type: EntityRow<Entity>
    readonly required: true
  },
  {
    readonly name: 'insert'
    readonly type: EntityInsert<Entity>
    readonly required: true
  },
  {
    readonly name: 'update'
    readonly type: EntityUpdate<Entity>
    readonly required: true
  },
  {
    readonly name: 'delete'
    readonly type: EntityRow<Entity>
    readonly required: true
  },
]

type ViewActions<Entity> = readonly [
  {
    readonly name: 'select'
    readonly type: EntityRow<Entity>
    readonly required: true
  },
]

type SelectedTableNames<Selection> = Selection extends {
  readonly tables: readonly (infer Name)[]
}
  ? Extract<Name, string>
  : never

type SelectedViewNames<Selection> = Selection extends {
  readonly views: readonly (infer Name)[]
}
  ? Extract<Name, string>
  : never

type SelectedTables<
  Database,
  Schema extends SchemaNames<Database>,
  Selection,
> = Selection extends { readonly tables: readonly string[] }
  ? {
      readonly [
        Table in Extract<
          SelectedTableNames<Selection>,
          SupabaseTableNames<Database, Schema>
        >
      ]: TableActions<TablesAt<Database, Schema>[Table]>
    }
  : never

type SelectedViews<
  Database,
  Schema extends SchemaNames<Database>,
  Selection,
> = Selection extends { readonly views: readonly string[] }
  ? {
      readonly [
        View in Extract<
          SelectedViewNames<Selection>,
          SupabaseViewNames<Database, Schema>
        >
      ]: ViewActions<ViewsAt<Database, Schema>[View]>
    }
  : never

type SupabaseSchemaDefinition<
  Database,
  Schema extends SchemaNames<Database>,
  Selection,
> = (Selection extends { readonly tables: readonly string[] }
  ? { readonly tables: SelectedTables<Database, Schema, Selection> }
  : object) &
  (Selection extends { readonly views: readonly string[] }
    ? { readonly views: SelectedViews<Database, Schema, Selection> }
    : object)

/**
 * A Permix Definition inferred from selected generated Database entities.
 */
export type SupabaseDefinition<
  Database,
  Selection extends SupabaseSelection<Database>,
> = {
  readonly [
    Schema in keyof Selection & SchemaNames<Database>
  ]: SupabaseSchemaDefinition<Database, Schema, Selection[Schema]>
}

/**
 * Preserves a literal selection while checking it against Database.
 */
export function defineSupabaseSelection<Database>() {
  return <const Selection extends SupabaseSelection<Database>>(
    selection: Selection
  ): Selection => selection
}
