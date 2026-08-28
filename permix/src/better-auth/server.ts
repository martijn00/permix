import type { BetterAuthPlugin, Session, User } from 'better-auth'
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api'

import type {
  AdapterDecision,
  PermissionAdapter,
  PermissionKeySource,
} from '../adapter'
import { createAdapter } from '../adapter'
import type { CheckArgs, Definition, Permix, Rules } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type { MaybePromise } from '../utils'

export interface BetterAuthSession {
  readonly session: Session
  readonly user: User
}

export interface BetterAuthPermixOptions<
  D extends Definition,
  S extends BetterAuthSession,
> {
  readonly resolveRules: (session: S) => MaybePromise<Rules<D>>
  readonly catalog?: PermissionCatalog
  readonly createInstance?: () => Permix<D>
}

export interface BetterAuthSessionApi<S extends BetterAuthSession> {
  readonly api: {
    readonly getSession: (input: {
      readonly headers: Headers
    }) => MaybePromise<S | null>
  }
}

type SessionAdapter<
  D extends Definition,
  S extends BetterAuthSession,
> = PermissionAdapter<D, S | null, S>

function optionalAdapterOptions<D extends Definition>(
  catalog: PermissionCatalog | undefined,
  createInstance: (() => Permix<D>) | undefined
) {
  return {
    ...(catalog === undefined ? {} : { catalog }),
    ...(createInstance === undefined ? {} : { createInstance }),
  }
}

/**
 * A Better Auth server plugin configured with instance-local permission rules.
 * Every resolution delegates to the provider-neutral adapter kernel.
 */
export function createBetterAuthPermixPlugin<
  D extends Definition,
  S extends BetterAuthSession = BetterAuthSession,
>(options: BetterAuthPermixOptions<D, S>) {
  const adapter: SessionAdapter<D, S> = createAdapter({
    authenticate: (session) => session,
    resolveRules: ({ principal }) => options.resolveRules(principal),
    ...optionalAdapterOptions(options.catalog, options.createInstance),
  })

  const getPermissions = createAuthEndpoint(
    '/permix/get-permissions',
    {
      method: 'GET',
      use: [sessionMiddleware],
      metadata: { noStore: true },
    },
    async (context) => {
      const session = context.context.session as S
      return context.json(await adapter.dehydrate(session))
    }
  )

  const plugin = {
    id: 'permix',
    endpoints: { getPermissions },
  } as const satisfies BetterAuthPlugin

  return Object.assign(plugin, {
    catalog: adapter.catalog,
    resolveSession: (session: S | null) => adapter.resolve(session),
    checkSession: (session: S | null, ...args: CheckArgs<D>) =>
      adapter.check(session, ...args),
    dehydrateSession: (session: S | null) => adapter.dehydrate(session),
    validateCoverage: (providerManifest: PermissionKeySource) =>
      adapter.validateCoverage(providerManifest),
  })
}

export type BetterAuthPermixPlugin<
  D extends Definition,
  S extends BetterAuthSession = BetterAuthSession,
> = ReturnType<typeof createBetterAuthPermixPlugin<D, S>>

function headersFrom(input: Request | Headers): Headers {
  return input instanceof Request ? input.headers : input
}

/**
 * Resolves a request through Better Auth's generated `auth.api.getSession`
 * before creating a fresh Permix instance.
 */
export async function resolveBetterAuthRequest<
  D extends Definition,
  S extends BetterAuthSession,
>(
  auth: BetterAuthSessionApi<S>,
  plugin: BetterAuthPermixPlugin<D, S>,
  input: Request | Headers
) {
  const session = await auth.api.getSession({ headers: headersFrom(input) })
  return plugin.resolveSession(session)
}

export async function checkBetterAuthRequest<
  D extends Definition,
  S extends BetterAuthSession,
>(
  auth: BetterAuthSessionApi<S>,
  plugin: BetterAuthPermixPlugin<D, S>,
  input: Request | Headers,
  ...args: CheckArgs<D>
): Promise<AdapterDecision> {
  const { permix } = await resolveBetterAuthRequest(auth, plugin, input)
  return permix.check(...args)
    ? { allowed: true }
    : {
        allowed: false,
        error: { code: 'forbidden', message: 'Forbidden.' },
      }
}
