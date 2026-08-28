import type { ClerkClient, SessionAuthObject } from '@clerk/backend'

import type {
  AdapterRuleContext,
  PermissionAdapter,
  PermissionKeySource,
} from '../adapter'
import { AdapterError, createAdapter } from '../adapter'
import type { Definition, Permix, Rules } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type { MaybePromise } from '../utils'

type SignedInClerkAuth = Extract<
  SessionAuthObject,
  { readonly isAuthenticated: true }
>

export type ClerkSessionClaims = SignedInClerkAuth['sessionClaims']
export type ClerkHas = SignedInClerkAuth['has']

/**
 * Authorization facts copied from one verified Clerk session token.
 *
 * The claims, permissions, and role can remain stale until Clerk refreshes the
 * session token. No User, Session, Organization, or Membership resource is
 * fetched or exposed.
 */
export interface ClerkPrincipal<
  Claims extends ClerkSessionClaims = ClerkSessionClaims,
> {
  readonly userId: string
  readonly sessionId: string
  readonly orgId: string | undefined
  readonly orgRole: string | undefined
  readonly orgPermissions: readonly string[] | undefined
  readonly sessionClaims: Claims
  readonly has: ClerkHas
}

export interface ClerkRequestState {
  readonly isAuthenticated: boolean
  readonly toAuth: () => SessionAuthObject | null
}

export type ClerkRequestAuthenticator = (
  request: Request
) => MaybePromise<ClerkRequestState | SessionAuthObject | null>

export type ClerkAuthInput = Request | SessionAuthObject

type ClerkClientSource =
  | Pick<ClerkClient, 'authenticateRequest'>
  | PromiseLike<Pick<ClerkClient, 'authenticateRequest'>>
  | (() => MaybePromise<Pick<ClerkClient, 'authenticateRequest'>>)

export type ClerkAuthenticateRequestOptions = NonNullable<
  Parameters<ClerkClient['authenticateRequest']>[1]
>

export interface CreateClerkPermixOptions<
  D extends Definition,
  Claims extends ClerkSessionClaims = ClerkSessionClaims,
> {
  readonly authenticateRequest?: ClerkRequestAuthenticator
  readonly resolveRules: (
    principal: ClerkPrincipal<Claims>
  ) => MaybePromise<Rules<D>>
  readonly catalog?: PermissionCatalog
  readonly createInstance?: () => Permix<D>
}

export interface ClerkPermix<
  D extends Definition,
  Claims extends ClerkSessionClaims = ClerkSessionClaims,
> extends PermissionAdapter<D, ClerkAuthInput, ClerkPrincipal<Claims>> {
  validateCoverage: (
    providerManifest: PermissionKeySource
  ) => ReturnType<
    PermissionAdapter<
      D,
      ClerkAuthInput,
      ClerkPrincipal<Claims>
    >['validateCoverage']
  >
}

async function resolveClient(
  source: ClerkClientSource
): Promise<Pick<ClerkClient, 'authenticateRequest'>> {
  return await (typeof source === 'function' ? source() : source)
}

/**
 * Adapts the current `clerkClient.authenticateRequest()` request-state API.
 * Pass a factory such as async `() => clerkClient()` when the provider client
 * itself is request-scoped.
 */
export function createClerkRequestAuthenticator(
  client: ClerkClientSource,
  options?: ClerkAuthenticateRequestOptions
): ClerkRequestAuthenticator {
  return async (request) => {
    const resolved = await resolveClient(client)
    return options === undefined
      ? resolved.authenticateRequest(request)
      : resolved.authenticateRequest(request, options)
  }
}

function isRequestState(value: unknown): value is ClerkRequestState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toAuth' in value &&
    typeof value.toAuth === 'function'
  )
}

function isSessionAuth(value: unknown): value is SessionAuthObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isAuthenticated' in value &&
    typeof value.isAuthenticated === 'boolean' &&
    'has' in value &&
    typeof value.has === 'function'
  )
}

function principalFromAuth<Claims extends ClerkSessionClaims>(
  auth: SessionAuthObject | null
): ClerkPrincipal<Claims> | null {
  if (
    auth === null ||
    !auth.isAuthenticated ||
    typeof auth.userId !== 'string' ||
    typeof auth.sessionId !== 'string' ||
    typeof auth.sessionClaims !== 'object' ||
    auth.sessionClaims === null
  ) {
    return null
  }

  return {
    userId: auth.userId,
    sessionId: auth.sessionId,
    orgId: auth.orgId,
    orgRole: auth.orgRole,
    orgPermissions: auth.orgPermissions,
    sessionClaims: auth.sessionClaims as Claims,
    has: (params) => auth.has(params),
  }
}

async function authenticateInput<Claims extends ClerkSessionClaims>(
  input: ClerkAuthInput,
  authenticateRequest: ClerkRequestAuthenticator | undefined
): Promise<ClerkPrincipal<Claims> | null> {
  if (!(input instanceof Request)) {
    return principalFromAuth<Claims>(input)
  }
  if (authenticateRequest === undefined) {
    throw new AdapterError(
      'invalid-request',
      'Request authentication is not configured.'
    )
  }

  const result = await authenticateRequest(input)
  const auth = isRequestState(result)
    ? result.isAuthenticated
      ? result.toAuth()
      : null
    : isSessionAuth(result)
      ? result
      : null
  return principalFromAuth<Claims>(auth)
}

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
 * Creates a framework-neutral Clerk integration backed by `permix/adapter`.
 * Each call authenticates again, resolves async rules, and creates a fresh
 * Permix instance. This is a Permix integration, not a Clerk plugin.
 */
export function createClerkPermix<
  D extends Definition,
  Claims extends ClerkSessionClaims = ClerkSessionClaims,
>(options: CreateClerkPermixOptions<D, Claims>): ClerkPermix<D, Claims> {
  return createAdapter({
    authenticate: (input: ClerkAuthInput) =>
      authenticateInput<Claims>(input, options.authenticateRequest),
    resolveRules: ({
      principal,
    }: AdapterRuleContext<ClerkAuthInput, ClerkPrincipal<Claims>>) =>
      options.resolveRules(principal),
    ...optionalAdapterOptions(options.catalog, options.createInstance),
  })
}
