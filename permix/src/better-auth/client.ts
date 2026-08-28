import type { BetterAuthClientPlugin, BetterAuthPlugin } from 'better-auth'

import type { Definition } from '../core'
import type { BetterAuthPermixPlugin } from './server'

export interface BetterAuthPermixClientPlugin<
  ServerPlugin extends BetterAuthPlugin,
> extends BetterAuthClientPlugin {
  readonly id: 'permix'
  readonly $InferServerPlugin: ServerPlugin
  readonly pathMethods: {
    readonly '/permix/get-permissions': 'GET'
  }
}

/**
 * Connects Better Auth's generated client API to the server plugin endpoint.
 *
 * @example
 * `createAuthClient({ plugins: [permixClient<typeof serverPlugin>()] })`
 */
export function createBetterAuthPermixClient<
  ServerPlugin extends BetterAuthPlugin = BetterAuthPermixPlugin<Definition>,
>(): BetterAuthPermixClientPlugin<ServerPlugin> {
  return {
    id: 'permix',
    $InferServerPlugin: {} as ServerPlugin,
    pathMethods: {
      '/permix/get-permissions': 'GET',
    },
  }
}

export const permixClient = createBetterAuthPermixClient
