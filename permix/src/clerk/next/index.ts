import { auth } from '@clerk/nextjs/server'

import type { Definition } from '../../core'
import { createClerkPermix } from '../server'
import type {
  ClerkPermix,
  ClerkSessionClaims,
  CreateClerkPermixOptions,
} from '../server'

export type CreateNextClerkPermixOptions<
  D extends Definition,
  Claims extends ClerkSessionClaims = ClerkSessionClaims,
> = Omit<CreateClerkPermixOptions<D, Claims>, 'authenticateRequest'>

/**
 * Thin Next.js App Router convenience over the current async Clerk `auth()`.
 * All rule resolution and per-call instance creation remain in the base
 * framework-neutral Clerk integration.
 */
export function createNextClerkPermix<
  D extends Definition,
  Claims extends ClerkSessionClaims = ClerkSessionClaims,
>(options: CreateNextClerkPermixOptions<D, Claims>): ClerkPermix<D, Claims> {
  return createClerkPermix({
    ...options,
    authenticateRequest: async () => await auth(),
  })
}
