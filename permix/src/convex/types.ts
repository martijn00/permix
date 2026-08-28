import type {
  ActionBuilder,
  ArgsArrayForOptionalValidator,
  ArgsArrayToObject,
  DefaultArgsForOptionalValidator,
  FunctionVisibility,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  HttpActionBuilder,
  MutationBuilder,
  PublicHttpAction,
  QueryBuilder,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
  ReturnValueForOptionalValidator,
  UserIdentity,
} from 'convex/server'
import type {
  GenericValidator,
  PropertyValidators,
  Validator,
} from 'convex/values'

import type { PermissionCoverageResult, PermissionKeySource } from '../adapter'
import type { Definition, Permix, Rules } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type { MaybePromise } from '../utils'

export type ConvexFunctionKind = 'query' | 'mutation' | 'action' | 'httpAction'

export type ConvexContextByKind<
  DataModel extends GenericDataModel,
  Kind extends ConvexFunctionKind,
> = Kind extends 'query'
  ? GenericQueryCtx<DataModel>
  : Kind extends 'mutation'
    ? GenericMutationCtx<DataModel>
    : GenericActionCtx<DataModel>

export type ConvexPermixHandlerContext<
  DataModel extends GenericDataModel,
  D extends Definition,
  Identity extends UserIdentity,
  Kind extends ConvexFunctionKind,
> = ConvexContextByKind<DataModel, Kind> & {
  readonly identity: Identity
  readonly permix: Permix<D>
}

interface ConvexRuleContextForKind<
  DataModel extends GenericDataModel,
  Identity extends UserIdentity,
  Kind extends Exclude<ConvexFunctionKind, 'httpAction'>,
> {
  readonly kind: Kind
  readonly ctx: ConvexContextByKind<DataModel, Kind>
  readonly identity: Identity
  readonly args: readonly unknown[]
}

export type ConvexRuleContext<
  DataModel extends GenericDataModel,
  Identity extends UserIdentity,
> =
  | ConvexRuleContextForKind<DataModel, Identity, 'query'>
  | ConvexRuleContextForKind<DataModel, Identity, 'mutation'>
  | ConvexRuleContextForKind<DataModel, Identity, 'action'>
  | {
      readonly kind: 'httpAction'
      readonly ctx: GenericActionCtx<DataModel>
      readonly identity: Identity
      readonly request: Request
    }

export interface CreateConvexPermixOptions<
  D extends Definition,
  DataModel extends GenericDataModel,
  Identity extends UserIdentity,
> {
  readonly resolveRules: (
    context: ConvexRuleContext<DataModel, Identity>
  ) => MaybePromise<Rules<D>>
  readonly catalog?: PermissionCatalog
  readonly createInstance?: () => Permix<D>
}

type ConvexArgsValidator = PropertyValidators | GenericValidator | void
type ConvexReturnsValidator =
  | PropertyValidators
  | Validator<unknown, 'required', string>
  | void

export type ConvexPermixQueryBuilder<
  DataModel extends GenericDataModel,
  D extends Definition,
  Identity extends UserIdentity,
  Visibility extends FunctionVisibility,
> = <
  ArgsValidator extends ConvexArgsValidator,
  ReturnsValidator extends ConvexReturnsValidator,
  ReturnValue extends ReturnValueForOptionalValidator<ReturnsValidator> =
    ReturnValueForOptionalValidator<ReturnsValidator>,
  OneOrZeroArgs extends ArgsArrayForOptionalValidator<ArgsValidator> =
    DefaultArgsForOptionalValidator<ArgsValidator>,
>(
  query:
    | {
        readonly args?: ArgsValidator
        readonly returns?: ReturnsValidator
        readonly handler: (
          ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'query'>,
          ...args: OneOrZeroArgs
        ) => ReturnValue
      }
    | ((
        ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'query'>,
        ...args: OneOrZeroArgs
      ) => ReturnValue)
) => RegisteredQuery<Visibility, ArgsArrayToObject<OneOrZeroArgs>, ReturnValue>

export type ConvexPermixMutationBuilder<
  DataModel extends GenericDataModel,
  D extends Definition,
  Identity extends UserIdentity,
  Visibility extends FunctionVisibility,
> = <
  ArgsValidator extends ConvexArgsValidator,
  ReturnsValidator extends ConvexReturnsValidator,
  ReturnValue extends ReturnValueForOptionalValidator<ReturnsValidator> =
    ReturnValueForOptionalValidator<ReturnsValidator>,
  OneOrZeroArgs extends ArgsArrayForOptionalValidator<ArgsValidator> =
    DefaultArgsForOptionalValidator<ArgsValidator>,
>(
  mutation:
    | {
        readonly args?: ArgsValidator
        readonly returns?: ReturnsValidator
        readonly handler: (
          ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'mutation'>,
          ...args: OneOrZeroArgs
        ) => ReturnValue
      }
    | ((
        ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'mutation'>,
        ...args: OneOrZeroArgs
      ) => ReturnValue)
) => RegisteredMutation<
  Visibility,
  ArgsArrayToObject<OneOrZeroArgs>,
  ReturnValue
>

export type ConvexPermixActionBuilder<
  DataModel extends GenericDataModel,
  D extends Definition,
  Identity extends UserIdentity,
  Visibility extends FunctionVisibility,
> = <
  ArgsValidator extends ConvexArgsValidator,
  ReturnsValidator extends ConvexReturnsValidator,
  ReturnValue extends ReturnValueForOptionalValidator<ReturnsValidator> =
    ReturnValueForOptionalValidator<ReturnsValidator>,
  OneOrZeroArgs extends ArgsArrayForOptionalValidator<ArgsValidator> =
    DefaultArgsForOptionalValidator<ArgsValidator>,
>(
  action:
    | {
        readonly args?: ArgsValidator
        readonly returns?: ReturnsValidator
        readonly handler: (
          ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'action'>,
          ...args: OneOrZeroArgs
        ) => ReturnValue
      }
    | ((
        ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'action'>,
        ...args: OneOrZeroArgs
      ) => ReturnValue)
) => RegisteredAction<Visibility, ArgsArrayToObject<OneOrZeroArgs>, ReturnValue>

export type ConvexPermixHttpActionBuilder<
  DataModel extends GenericDataModel,
  D extends Definition,
  Identity extends UserIdentity,
> = (
  handler: (
    ctx: ConvexPermixHandlerContext<DataModel, D, Identity, 'httpAction'>,
    request: Request
  ) => Promise<Response>
) => PublicHttpAction

export interface ConvexPermix<
  D extends Definition,
  DataModel extends GenericDataModel,
  Identity extends UserIdentity,
> {
  readonly catalog: PermissionCatalog | null
  readonly query: <Visibility extends FunctionVisibility>(
    builder: QueryBuilder<DataModel, Visibility>
  ) => ConvexPermixQueryBuilder<DataModel, D, Identity, Visibility>
  readonly mutation: <Visibility extends FunctionVisibility>(
    builder: MutationBuilder<DataModel, Visibility>
  ) => ConvexPermixMutationBuilder<DataModel, D, Identity, Visibility>
  readonly action: <Visibility extends FunctionVisibility>(
    builder: ActionBuilder<DataModel, Visibility>
  ) => ConvexPermixActionBuilder<DataModel, D, Identity, Visibility>
  readonly httpAction: (
    builder: HttpActionBuilder
  ) => ConvexPermixHttpActionBuilder<DataModel, D, Identity>
  readonly validateCoverage: (
    providerManifest: PermissionKeySource
  ) => PermissionCoverageResult | null
  readonly $inferDefinition: D
  readonly $inferIdentity: Identity
}
