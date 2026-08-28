import type {
  AdapterCheckRequest,
  AdapterDecision,
  AdapterErrorDto,
  AdapterPathCheckArgs,
} from '../adapter'
import type { Definition, DehydratedState, Permix, Rules } from '../core'
import type { PermissionCatalog } from '../extractor/types'
import type { MaybePromise } from '../utils'

export type PdpMode = 'caller' | 'service'

export interface PdpAdapterInput {
  readonly request: Request
  readonly mode: PdpMode
  readonly subject?: string
}

export interface PdpRuleContext<Principal> {
  readonly request: Request
  readonly mode: PdpMode
  readonly principal: Principal
}

export interface PdpSubjectContext<ServicePrincipal> {
  readonly request: Request
  readonly service: ServicePrincipal
  readonly subject: string
}

export interface CreatePdpHandlerOptions<
  D extends Definition,
  Principal,
  ServicePrincipal,
> {
  readonly authenticateCaller: (
    request: Request
  ) => MaybePromise<Principal | null>
  readonly authenticateService: (
    request: Request
  ) => MaybePromise<ServicePrincipal | null>
  readonly resolveSubject: (
    context: PdpSubjectContext<ServicePrincipal>
  ) => MaybePromise<Principal | null>
  readonly resolveRules: (
    context: PdpRuleContext<Principal>
  ) => MaybePromise<Rules<D>>
  readonly createInstance?: () => Permix<D>
  readonly catalog?: PermissionCatalog
  readonly version?: string
}

export type PdpHandler = (request: Request) => Promise<Response>

export interface PdpBatchError {
  readonly error: AdapterErrorDto
}

export type PdpBatchResult = AdapterDecision | PdpBatchError

export interface PdpMetadata {
  readonly protocolVersion: 'v1'
  readonly version: string
  readonly catalog: PermissionCatalog | null
}

export type PdpHeaders =
  | Headers
  | Readonly<Record<string, string>>
  | [string, string][]

export type PdpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export interface CreatePdpClientOptions {
  readonly baseUrl?: string
  readonly fetch?: PdpFetch
  readonly headers?: () => MaybePromise<PdpHeaders>
}

export interface PdpClient<D extends Definition> {
  check: (...args: AdapterPathCheckArgs<D>) => Promise<AdapterDecision>
  checkAs: (
    subject: string,
    ...args: AdapterPathCheckArgs<D>
  ) => Promise<AdapterDecision>
  checkMany: (
    checks: readonly AdapterCheckRequest<D>[]
  ) => Promise<readonly PdpBatchResult[]>
  checkManyAs: (
    subject: string,
    checks: readonly AdapterCheckRequest<D>[]
  ) => Promise<readonly PdpBatchResult[]>
  permissions: () => Promise<DehydratedState<D>>
  permissionsAs: (subject: string) => Promise<DehydratedState<D>>
  health: () => Promise<{ readonly status: 'ok' }>
  metadata: () => Promise<PdpMetadata>
}
