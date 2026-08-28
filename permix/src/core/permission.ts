export type JsonPrimitive = boolean | null | number | string

export interface JsonObject {
  readonly [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[]

export interface PermissionMetadata {
  readonly title?: string
  readonly description?: string
  readonly tags?: readonly string[]
  readonly annotations?: JsonObject
}

export interface PermissionMarker<
  K extends string = string,
> extends PermissionMetadata {
  readonly key: K
}

type ExactPermissionMetadataConfig<
  Key extends string,
  Config extends Readonly<Record<string, PermissionMetadata>>,
> = Config & Readonly<Record<Exclude<keyof Config, Key>, never>>

/**
 * Marks a permission for catalog extraction without changing its runtime value.
 *
 * Permission keys must be static string literals so the extractor can discover
 * them without executing application code.
 */
export function permission<const K extends string>(
  keyOrMarker: K | PermissionMarker<K>
): K {
  return typeof keyOrMarker === 'string' ? keyOrMarker : keyOrMarker.key
}

/**
 * Creates an identity helper for centrally enriching extracted permissions.
 */
export function createPermissionConfig<Key extends string>() {
  return <const Config extends Readonly<Record<string, PermissionMetadata>>>(
    config: ExactPermissionMetadataConfig<Key, Config>
  ): Config => config
}
