import type {
  ActionBuilder,
  FunctionVisibility,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
  UserIdentity,
} from 'convex/server'

import { createAdapter } from '../adapter'
import type { Definition } from '../core'
import type {
  ConvexFunctionKind,
  ConvexPermix,
  ConvexPermixActionBuilder,
  ConvexPermixHandlerContext,
  ConvexPermixHttpActionBuilder,
  ConvexPermixMutationBuilder,
  ConvexPermixQueryBuilder,
  CreateConvexPermixOptions,
} from './types'

type ConvexInvocation<DataModel extends GenericDataModel> =
  | {
      readonly kind: 'query'
      readonly ctx: GenericQueryCtx<DataModel>
      readonly args: readonly unknown[]
    }
  | {
      readonly kind: 'mutation'
      readonly ctx: GenericMutationCtx<DataModel>
      readonly args: readonly unknown[]
    }
  | {
      readonly kind: 'action'
      readonly ctx: GenericActionCtx<DataModel>
      readonly args: readonly unknown[]
    }
  | {
      readonly kind: 'httpAction'
      readonly ctx: GenericActionCtx<DataModel>
      readonly request: Request
    }

interface RuntimeContext {
  readonly auth: {
    getUserIdentity: () => Promise<UserIdentity | null>
  }
}

type RuntimeHandler = (
  ctx: RuntimeContext,
  ...args: readonly unknown[]
) => unknown

type RuntimeDefinition =
  | RuntimeHandler
  | {
      readonly handler: RuntimeHandler
      readonly [key: string]: unknown
    }

type RuntimeBuilder = (definition: RuntimeDefinition) => unknown

function optionalAdapterOptions<
  D extends Definition,
  DataModel extends GenericDataModel,
  Identity extends UserIdentity,
>(options: CreateConvexPermixOptions<D, DataModel, Identity>) {
  return {
    ...(options.catalog === undefined ? {} : { catalog: options.catalog }),
    ...(options.createInstance === undefined
      ? {}
      : { createInstance: options.createInstance }),
  }
}

function handlerFromDefinition(definition: RuntimeDefinition): RuntimeHandler {
  return typeof definition === 'function' ? definition : definition.handler
}

function replaceHandler(
  definition: RuntimeDefinition,
  handler: RuntimeHandler
): RuntimeDefinition {
  return typeof definition === 'function' ? handler : { ...definition, handler }
}

/**
 * Creates Convex function wrappers that authenticate with
 * `ctx.auth.getUserIdentity()` and resolve an isolated Permix instance before
 * application handler work begins.
 */
export function createConvexPermix<
  D extends Definition,
  DataModel extends GenericDataModel,
  Identity extends UserIdentity = UserIdentity,
>(
  options: CreateConvexPermixOptions<D, DataModel, Identity>
): ConvexPermix<D, DataModel, Identity> {
  const adapter = createAdapter<D, ConvexInvocation<DataModel>, Identity>({
    authenticate: async (invocation) => {
      const identity = await invocation.ctx.auth.getUserIdentity()
      return identity as Identity | null
    },
    resolveRules: ({ input, principal }) =>
      options.resolveRules({
        ...input,
        identity: principal,
      }),
    ...optionalAdapterOptions(options),
  })

  function wrapFunction(
    builder: RuntimeBuilder,
    kind: Exclude<ConvexFunctionKind, 'httpAction'>
  ): RuntimeBuilder {
    return (definition) => {
      const handler = handlerFromDefinition(definition)
      const wrapped: RuntimeHandler = async (ctx, ...args) => {
        const invocation = {
          kind,
          ctx,
          args,
        } as ConvexInvocation<DataModel>
        const { permix, principal } = await adapter.resolve(invocation)
        const handlerContext = {
          ...ctx,
          identity: principal,
          permix,
        }
        return await handler(handlerContext, ...args)
      }
      return builder(replaceHandler(definition, wrapped))
    }
  }

  function wrapQuery<Visibility extends FunctionVisibility>(
    builder: QueryBuilder<DataModel, Visibility>
  ): ConvexPermixQueryBuilder<DataModel, D, Identity, Visibility> {
    return wrapFunction(builder, 'query') as ConvexPermixQueryBuilder<
      DataModel,
      D,
      Identity,
      Visibility
    >
  }

  function wrapMutation<Visibility extends FunctionVisibility>(
    builder: MutationBuilder<DataModel, Visibility>
  ): ConvexPermixMutationBuilder<DataModel, D, Identity, Visibility> {
    return wrapFunction(builder, 'mutation') as ConvexPermixMutationBuilder<
      DataModel,
      D,
      Identity,
      Visibility
    >
  }

  function wrapAction<Visibility extends FunctionVisibility>(
    builder: ActionBuilder<DataModel, Visibility>
  ): ConvexPermixActionBuilder<DataModel, D, Identity, Visibility> {
    return wrapFunction(builder, 'action') as ConvexPermixActionBuilder<
      DataModel,
      D,
      Identity,
      Visibility
    >
  }

  function wrapHttpAction(
    builder: HttpActionBuilder
  ): ConvexPermixHttpActionBuilder<DataModel, D, Identity> {
    return ((handler) =>
      (builder as unknown as RuntimeBuilder)((async (
        ctx: RuntimeContext,
        request: Request
      ) => {
        const invocation = {
          kind: 'httpAction',
          ctx,
          request,
        } as ConvexInvocation<DataModel>
        const { permix, principal } = await adapter.resolve(invocation)
        const handlerContext = {
          ...ctx,
          identity: principal,
          permix,
        } as ConvexPermixHandlerContext<DataModel, D, Identity, 'httpAction'>
        return await handler(handlerContext, request)
      }) as unknown as RuntimeHandler)) as ConvexPermixHttpActionBuilder<
      DataModel,
      D,
      Identity
    >
  }

  return {
    catalog: adapter.catalog,
    query: wrapQuery,
    mutation: wrapMutation,
    action: wrapAction,
    httpAction: wrapHttpAction,
    validateCoverage: (providerManifest) =>
      adapter.validateCoverage(providerManifest),
    $inferDefinition: undefined as unknown as D,
    $inferIdentity: undefined as unknown as Identity,
  }
}
