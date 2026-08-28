import type { PermissionCoverageResult } from '../adapter'
import { AdapterError } from '../adapter'
import type { Definition, RulesPaths } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import { validatePermissionCoverage } from '../extractor/validate'
import type { ClerkHas, ClerkPrincipal } from './server'

type ClerkHasParams = Parameters<ClerkHas>[0]
type ClerkPermission = Extract<
  ClerkHasParams,
  { readonly permission: unknown }
>['permission']
type ClerkRole = Extract<ClerkHasParams, { readonly role: unknown }>['role']

export type ClerkAuthorizationTarget =
  | { readonly permission: ClerkPermission }
  | { readonly role: ClerkRole }

/**
 * Maps application-owned Permix paths to Clerk custom authorization checks.
 * The canonical path can use any vocabulary; only the target value uses a
 * Clerk custom permission or role key.
 */
export type ClerkAuthorizationMappingInput<D extends Definition> = {
  readonly [Path in RulesPaths<D>]?: ClerkAuthorizationTarget
}

export interface ClerkAuthorizationMapping<D extends Definition> {
  readonly entries: ClerkAuthorizationMappingInput<D>
  readonly keys: readonly RulesPaths<D>[]
  readonly coverage: PermissionCoverageResult | null
  check: (principal: ClerkPrincipal, path: RulesPaths<D>) => boolean
}

export interface CreateClerkAuthorizationMappingOptions {
  readonly catalog?: PermissionCatalog
}

export const CLERK_AUTHORIZATION_CAVEATS = {
  customPermissionsOnly:
    'Clerk Auth.has({ permission }) checks custom organization permissions; system permissions are unavailable in server session claims.',
  staleClaims:
    'Clerk organization permissions, roles, and session claims can remain stale until the session token is refreshed.',
} as const

function isSystemPermission(target: ClerkAuthorizationTarget): boolean {
  return 'permission' in target && target.permission.startsWith('org:sys_')
}

/**
 * Creates an explicit canonical-path mapping without provisioning or changing
 * Clerk permissions, roles, features, or plans.
 */
export function createClerkAuthorizationMapping<D extends Definition>(
  entries: ClerkAuthorizationMappingInput<D>,
  options: CreateClerkAuthorizationMappingOptions = {}
): ClerkAuthorizationMapping<D> {
  const keys = Object.keys(entries) as RulesPaths<D>[]

  for (const path of keys) {
    const target = entries[path]
    if (target !== undefined && isSystemPermission(target)) {
      throw new AdapterError(
        'invalid-request',
        'Clerk system permissions are unavailable in server session claims.'
      )
    }
  }

  return {
    entries,
    keys,
    coverage:
      options.catalog === undefined
        ? null
        : validatePermissionCoverage(options.catalog, keys),
    check(principal, path) {
      const target = entries[path]
      if (principal.orgId === undefined || target === undefined) {
        return false
      }
      return 'permission' in target
        ? principal.has({ permission: target.permission })
        : principal.has({ role: target.role })
    },
  }
}
