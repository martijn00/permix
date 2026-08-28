import type {
  CheckArgs,
  DataAtPath,
  Definition,
  DehydratedState,
  Permix,
  Rules,
  RulesPaths,
  SpecialPath,
} from '../core'
import { createPermix } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type {
  PermissionCoverageResult,
  PermissionKeySource,
} from '../extractor/validate'
import { validatePermissionCoverage } from '../extractor/validate'
import type { MaybePromise } from '../utils'
import { AdapterError } from './errors'

export interface AdapterResolution<D extends Definition, Principal> {
  readonly principal: Principal
  readonly permix: Permix<D>
}

export interface AdapterRuleContext<Input, Principal> {
  readonly input: Input
  readonly principal: Principal
}

export interface CreateAdapterOptions<D extends Definition, Input, Principal> {
  readonly authenticate: (input: Input) => MaybePromise<Principal | null>
  readonly resolveRules: (
    context: AdapterRuleContext<Input, Principal>
  ) => MaybePromise<Rules<D>>
  readonly createInstance?: () => Permix<D>
  /**
   * Optional extracted metadata. It is never loaded from disk and does not
   * participate in authentication, rule resolution, or decisions.
   */
  readonly catalog?: PermissionCatalog
}

export interface AllowedDecision {
  readonly allowed: true
}

export interface ForbiddenDecision {
  readonly allowed: false
  readonly error: {
    readonly code: 'forbidden'
    readonly message: 'Forbidden.'
  }
}

export type AdapterDecision = AllowedDecision | ForbiddenDecision

type ExcludeCallbackCheck<Args> = Args extends readonly [
  infer First,
  ...unknown[],
]
  ? First extends (...args: never[]) => unknown
    ? never
    : Args
  : never

/**
 * Check arguments that can cross a transport boundary. Unlike core
 * {@link CheckArgs}, callback-composed checks are deliberately excluded.
 */
export type AdapterPathCheckArgs<D extends Definition> = ExcludeCallbackCheck<
  CheckArgs<D>
>

type CheckRequestForPath<D extends Definition, Path extends RulesPaths<D>> =
  DataAtPath<D, Path> extends []
    ? { readonly path: Path }
    : [] extends DataAtPath<D, Path>
      ? {
          readonly path: Path
          readonly data?: DataAtPath<D, Path>[0]
        }
      : {
          readonly path: Path
          readonly data: DataAtPath<D, Path>[0]
        }

export type AdapterCheckRequest<D extends Definition> =
  | {
      [Path in RulesPaths<D>]: CheckRequestForPath<D, Path>
    }[RulesPaths<D>]
  | { readonly path: SpecialPath<D> }

export interface PermissionAdapter<D extends Definition, Input, Principal> {
  readonly catalog: PermissionCatalog | null
  resolve: (input: Input) => Promise<AdapterResolution<D, Principal>>
  check: (input: Input, ...args: CheckArgs<D>) => Promise<AdapterDecision>
  checkMany: (
    input: Input,
    checks: readonly AdapterCheckRequest<D>[]
  ) => Promise<readonly AdapterDecision[]>
  dehydrate: (input: Input) => Promise<DehydratedState<D>>
  validateCoverage: (
    providerManifest: PermissionKeySource
  ) => PermissionCoverageResult | null
}

const ALLOWED: AllowedDecision = { allowed: true }
const FORBIDDEN: ForbiddenDecision = {
  allowed: false,
  error: {
    code: 'forbidden',
    message: 'Forbidden.',
  },
}

function decision(allowed: boolean): AdapterDecision {
  return allowed ? ALLOWED : FORBIDDEN
}

function checkArgs<D extends Definition>(
  request: AdapterCheckRequest<D>
): CheckArgs<D> {
  if (
    typeof request !== 'object' ||
    request === null ||
    typeof request.path !== 'string' ||
    request.path.length === 0
  ) {
    throw new AdapterError(
      'invalid-request',
      'A check request requires a non-empty path.'
    )
  }

  if ('data' in request) {
    return [request.path, request.data] as unknown as CheckArgs<D>
  }

  return [request.path] as CheckArgs<D>
}

/**
 * Creates a provider-neutral adapter. Every operation authenticates its input,
 * resolves rules, creates a fresh Permix instance, and sets that instance up.
 */
export function createAdapter<D extends Definition, Input, Principal>(
  options: CreateAdapterOptions<D, Input, Principal>
): PermissionAdapter<D, Input, Principal> {
  const createInstance = options.createInstance ?? (() => createPermix<D>())
  const catalog = options.catalog ?? null

  async function resolve(
    input: Input
  ): Promise<AdapterResolution<D, Principal>> {
    const principal = await options.authenticate(input)
    if (principal === null) {
      throw new AdapterError('unauthenticated', 'Unauthenticated.')
    }

    const rules = await options.resolveRules({ input, principal })
    const permix = createInstance().setup(rules)

    return { principal, permix }
  }

  return {
    catalog,
    resolve,
    async check(input, ...args) {
      const { permix } = await resolve(input)
      return decision(permix.check(...args))
    },
    async checkMany(input, checks) {
      const { permix } = await resolve(input)
      return checks.map((request) =>
        decision(permix.check(...checkArgs(request)))
      )
    },
    async dehydrate(input) {
      const { permix } = await resolve(input)
      return permix.dehydrate()
    },
    validateCoverage(providerManifest) {
      return catalog === null
        ? null
        : validatePermissionCoverage(catalog, providerManifest)
    },
  }
}
