import type {
  ActionBuilder,
  DataModelFromSchemaDefinition,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
  UserIdentity,
} from 'convex/server'
import {
  actionGeneric,
  defineSchema,
  defineTable,
  httpActionGeneric,
  mutationGeneric,
  queryGeneric,
} from 'convex/server'
import { v } from 'convex/values'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { AdapterError } from '../adapter'
import { createPermix } from '../core'
import type { Permix } from '../core'
import { createConvexPermix, defineConvexTableSelection } from './index'
import type { ConvexDefinition, ConvexPermixHandlerContext } from './index'

const schema = defineSchema({
  documents: defineTable({
    ownerId: v.string(),
    title: v.string(),
  }),
})

type DataModel = DataModelFromSchemaDefinition<typeof schema>
// An interface does not satisfy Permix's recursive index-signature constraint.
// oxlint-disable-next-line typescript/consistent-type-definitions
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

interface RuntimeFunction {
  handler: (...args: unknown[]) => unknown
}

const query = queryGeneric as QueryBuilder<DataModel, 'public'>
const mutation = mutationGeneric as MutationBuilder<DataModel, 'public'>
const action = actionGeneric as ActionBuilder<DataModel, 'public'>
const httpAction = httpActionGeneric as HttpActionBuilder

function identity(subject: string): UserIdentity {
  return {
    tokenIdentifier: `issuer|${subject}`,
    subject,
    issuer: 'https://issuer.example',
  }
}

function context(subject: string | null) {
  return {
    auth: {
      getUserIdentity: async () =>
        subject === null ? null : identity(subject),
    },
  }
}

function runtimeFunction(value: unknown): RuntimeFunction {
  const registered = value as {
    readonly _handler: RuntimeFunction['handler']
  }
  return { handler: registered._handler }
}

describe('Convex integration', () => {
  it('resolves auth and rules before a query handler', async () => {
    const order: string[] = []
    const convex = createConvexPermix<Definition, DataModel>({
      resolveRules: async ({ identity: principal, kind }) => {
        order.push(`rules:${kind}:${principal.subject}`)
        return {
          documents: {
            read: true,
            update: ({ ownerId }) => ownerId === principal.subject,
          },
        }
      },
    })
    const registered = convex.query(query)({
      args: { ownerId: v.string() },
      returns: v.boolean(),
      handler: async ({ permix, identity: principal }, args) => {
        order.push(`handler:${principal.subject}`)
        return permix.check('documents.update', args)
      },
    })

    const result = await runtimeFunction(registered).handler(
      context('user-1'),
      { ownerId: 'user-1' }
    )

    expect(result).toBe(true)
    expect(order).toStrictEqual(['rules:query:user-1', 'handler:user-1'])
  })

  it('wraps mutations, actions, and HTTP actions', async () => {
    const kinds: string[] = []
    const convex = createConvexPermix<Definition, DataModel>({
      resolveRules: ({ kind }) => {
        kinds.push(kind)
        return {
          documents: {
            read: true,
            update: () => false,
          },
        }
      },
    })
    const registeredMutation = convex.mutation(mutation)({
      args: {},
      returns: v.string(),
      handler: async ({ identity: principal }) => principal.subject,
    })
    const registeredAction = convex.action(action)(
      async ({ identity: principal }) => principal.subject
    )
    const registeredHttpAction = convex.httpAction(httpAction)(
      async ({ identity: principal }, request) =>
        Response.json({
          subject: principal.subject,
          path: new URL(request.url).pathname,
        })
    )

    await expect(
      runtimeFunction(registeredMutation).handler(context('mutation-user'), {})
    ).resolves.toBe('mutation-user')
    await expect(
      runtimeFunction(registeredAction).handler(context('action-user'), {})
    ).resolves.toBe('action-user')
    const response = (await runtimeFunction(registeredHttpAction).handler(
      context('http-user'),
      new Request('https://example.test/permissions')
    )) as Response

    await expect(response.json()).resolves.toStrictEqual({
      subject: 'http-user',
      path: '/permissions',
    })
    expect(kinds).toStrictEqual(['mutation', 'action', 'httpAction'])
  })

  it('rejects unauthenticated invocations before handler work', async () => {
    let handled = false
    const convex = createConvexPermix<Definition, DataModel>({
      resolveRules: () => ({
        documents: { read: true, update: () => true },
      }),
    })
    const registered = convex.query(query)({
      args: {},
      handler: () => {
        handled = true
        return null
      },
    })

    await expect(
      runtimeFunction(registered).handler(context(null), {})
    ).rejects.toMatchObject({
      code: 'unauthenticated',
      message: 'Unauthenticated.',
    } satisfies Partial<AdapterError>)
    expect(handled).toBe(false)
  })

  it('isolates concurrent users and configured instances', async () => {
    const instances: Permix<Definition>[] = []
    let releaseFirst: (() => void) | undefined
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const create = (allowSubject: string) =>
      createConvexPermix<Definition, DataModel>({
        createInstance: () => {
          const instance = createPermix<Definition>()
          instances.push(instance)
          return instance
        },
        resolveRules: async ({ identity: principal }) => {
          if (principal.subject === 'first') {
            await firstBlocked
          }
          return {
            documents: {
              read: principal.subject === allowSubject,
              update: () => false,
            },
          }
        },
      })

    const allowFirst = create('first')
    const allowSecond = create('second')
    const firstQuery = allowFirst.query(query)({
      args: {},
      handler: ({ permix }) => permix.check('documents.read'),
    })
    const secondQuery = allowSecond.query(query)({
      args: {},
      handler: ({ permix }) => permix.check('documents.read'),
    })

    const first = runtimeFunction(firstQuery).handler(context('first'), {})
    const second = runtimeFunction(secondQuery).handler(context('second'), {})
    await expect(second).resolves.toBe(true)
    releaseFirst?.()
    await expect(first).resolves.toBe(true)
    expect(instances).toHaveLength(2)
    expect(instances[0]).not.toBe(instances[1])
  })

  it('preserves typed Convex handlers and inferred table definitions', () => {
    const selection = defineConvexTableSelection<DataModel>()([
      'documents',
    ] as const)
    type Inferred = ConvexDefinition<DataModel, typeof selection>
    type HandlerContext = ConvexPermixHandlerContext<
      DataModel,
      Definition,
      UserIdentity,
      'query'
    >

    expectTypeOf<Inferred>().toMatchTypeOf<Record<string, unknown>>()
    expectTypeOf<HandlerContext['identity']>().toEqualTypeOf<UserIdentity>()
    expectTypeOf<HandlerContext['permix']>().toEqualTypeOf<Permix<Definition>>()
  })
})
