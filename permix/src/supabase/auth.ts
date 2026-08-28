import type { AdapterRuleContext, PermissionAdapter } from '../adapter'
import { createAdapter } from '../adapter'
import type { Definition, Permix, Rules } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type { MaybePromise } from '../utils'

export interface SupabaseHeaders {
  get: (name: string) => string | null
}

export interface SupabaseRequest {
  readonly headers: SupabaseHeaders
}

/**
 * A string input is an Authorization header value, not an unverified JWT.
 */
export type SupabaseBearerInput = string | SupabaseHeaders | SupabaseRequest

export interface SupabaseAuthResult<Value> {
  readonly data: Value | null
  readonly error: unknown | null
}

export interface SupabaseClaimsClient<Claims extends object> {
  readonly auth: {
    getClaims: (
      token: string
    ) => MaybePromise<SupabaseAuthResult<{ readonly claims: Claims | null }>>
  }
}

export interface SupabaseUserClient<User extends object> {
  readonly auth: {
    getUser: (
      token: string
    ) => MaybePromise<SupabaseAuthResult<{ readonly user: User | null }>>
  }
}

type UserControlledMetadataKey = 'raw_user_meta_data' | 'user_metadata'

export type VerifiedSupabaseClaims<Claims extends object> = Omit<
  Claims,
  UserControlledMetadataKey
>

export type VerifiedSupabaseUser<User extends object> = Omit<
  User,
  UserControlledMetadataKey
>

export interface SupabaseClaimsPrincipal<Claims extends object> {
  readonly token: string
  readonly claims: VerifiedSupabaseClaims<Claims>
}

export interface SupabaseUserPrincipal<User extends object> {
  readonly token: string
  readonly user: VerifiedSupabaseUser<User>
}

type SupabaseClientSource<Input, Client> =
  | Client
  | PromiseLike<Client>
  | ((input: Input) => MaybePromise<Client>)

interface SupabaseAdapterOptions<
  D extends Definition,
  Input,
  Principal,
  Client,
> {
  readonly client: SupabaseClientSource<Input, Client>
  readonly resolveRules: (
    context: AdapterRuleContext<Input, Principal>
  ) => MaybePromise<Rules<D>>
  readonly catalog?: PermissionCatalog
  readonly createInstance?: () => Permix<D>
}

export type CreateSupabaseClaimsAdapterOptions<
  D extends Definition,
  Claims extends object,
  Input extends SupabaseBearerInput,
> = SupabaseAdapterOptions<
  D,
  Input,
  SupabaseClaimsPrincipal<Claims>,
  SupabaseClaimsClient<Claims>
>

export type CreateSupabaseUserAdapterOptions<
  D extends Definition,
  User extends object,
  Input extends SupabaseBearerInput,
> = SupabaseAdapterOptions<
  D,
  Input,
  SupabaseUserPrincipal<User>,
  SupabaseUserClient<User>
>

const BEARER_HEADER = /^Bearer[ \t]+([^\s,]+)$/i

function isHeaders(value: unknown): value is SupabaseHeaders {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof value.get === 'function'
  )
}

function authorizationValue(input: SupabaseBearerInput): string | null {
  if (typeof input === 'string') {
    return input
  }

  if ('headers' in input) {
    return input.headers.get('authorization')
  }

  return isHeaders(input) ? input.get('authorization') : null
}

/**
 * Extracts one well-formed Bearer credential without decoding or trusting it.
 */
export function extractSupabaseBearerToken(
  input: SupabaseBearerInput
): string | null {
  const value = authorizationValue(input)
  if (value === null) {
    return null
  }

  const match = BEARER_HEADER.exec(value.trim())
  return match?.[1] ?? null
}

function omitUserControlledMetadata<Value extends object>(
  value: Value
): Omit<Value, UserControlledMetadataKey> {
  const {
    raw_user_meta_data: _rawUserMetadata,
    user_metadata: _userMetadata,
    ...verified
  } = value as Value & {
    readonly raw_user_meta_data?: unknown
    readonly user_metadata?: unknown
  }
  return verified
}

/**
 * Verifies a Bearer token through Supabase Auth. Provider failures and empty
 * results are authentication failures; JWT payloads are never decoded locally.
 */
export async function verifySupabaseClaims<Claims extends object>(
  client: SupabaseClaimsClient<Claims>,
  input: SupabaseBearerInput
): Promise<SupabaseClaimsPrincipal<Claims> | null> {
  const token = extractSupabaseBearerToken(input)
  if (token === null) {
    return null
  }

  try {
    const { data, error } = await client.auth.getClaims(token)
    if (error !== null || data?.claims === null || data?.claims === undefined) {
      return null
    }

    return {
      token,
      claims: omitUserControlledMetadata(data.claims),
    }
  } catch {
    return null
  }
}

/**
 * Verifies a Bearer token through Supabase Auth and exposes a user shape that
 * excludes user-controlled metadata from authorization rule contexts.
 */
export async function verifySupabaseUser<User extends object>(
  client: SupabaseUserClient<User>,
  input: SupabaseBearerInput
): Promise<SupabaseUserPrincipal<User> | null> {
  const token = extractSupabaseBearerToken(input)
  if (token === null) {
    return null
  }

  try {
    const { data, error } = await client.auth.getUser(token)
    if (error !== null || data?.user === null || data?.user === undefined) {
      return null
    }

    return {
      token,
      user: omitUserControlledMetadata(data.user),
    }
  } catch {
    return null
  }
}

async function resolveClient<Input, Client>(
  source: SupabaseClientSource<Input, Client>,
  input: Input
): Promise<Client> {
  if (typeof source === 'function') {
    const factory = source as (input: Input) => MaybePromise<Client>
    return await factory(input)
  }

  return await source
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

export function createSupabaseClaimsAdapter<
  D extends Definition,
  Claims extends object,
  Input extends SupabaseBearerInput = SupabaseBearerInput,
>(
  options: CreateSupabaseClaimsAdapterOptions<D, Claims, Input>
): PermissionAdapter<D, Input, SupabaseClaimsPrincipal<Claims>> {
  return createAdapter({
    authenticate: async (input) =>
      verifySupabaseClaims(await resolveClient(options.client, input), input),
    resolveRules: options.resolveRules,
    ...optionalAdapterOptions(options.catalog, options.createInstance),
  })
}

export function createSupabaseUserAdapter<
  D extends Definition,
  User extends object,
  Input extends SupabaseBearerInput = SupabaseBearerInput,
>(
  options: CreateSupabaseUserAdapterOptions<D, User, Input>
): PermissionAdapter<D, Input, SupabaseUserPrincipal<User>> {
  return createAdapter({
    authenticate: async (input) =>
      verifySupabaseUser(await resolveClient(options.client, input), input),
    resolveRules: options.resolveRules,
    ...optionalAdapterOptions(options.catalog, options.createInstance),
  })
}
