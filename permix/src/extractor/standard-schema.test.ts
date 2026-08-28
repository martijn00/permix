import { type } from 'arktype'
import { Schema } from 'effect'
import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { action, createPermissionOverlay, createPermix } from '../core'
import type { ApplyPermissionOverlay } from '../core'
import { renderPermissionCatalog } from './generate'

const extractedDefinition = {
  resource: ['arktype', 'effect', 'valibot', 'zod'],
} as const

const zodSchema = z
  .object({ id: z.string() })
  .transform(({ id }) => ({ resourceId: id }))
const valibotSchema = v.object({ id: v.string() })
const arktypeSchema = type({ id: 'string' })
const effectSchema = Schema.standardSchemaV1(
  Schema.Struct({ id: Schema.String })
)

describe('generated definition Standard Schema interop', () => {
  it('retains schema output and required-data types through an overlay', () => {
    const defineOverlay = createPermissionOverlay<typeof extractedDefinition>()
    const overlay = defineOverlay({
      resource: [
        action('arktype', arktypeSchema),
        action('effect', effectSchema),
        action('valibot', valibotSchema),
        action('zod', zodSchema, { required: true }),
      ],
    })
    type Definition = ApplyPermissionOverlay<
      typeof extractedDefinition,
      typeof overlay
    >
    const permix = createPermix<Definition>().setup({
      resource: {
        arktype: (data) => {
          expectTypeOf(data).toEqualTypeOf<{ id: string } | undefined>()
          return true
        },
        effect: (data) => {
          expectTypeOf(data).toEqualTypeOf<
            { readonly id: string } | undefined
          >()
          return true
        },
        valibot: (data) => {
          expectTypeOf(data).toEqualTypeOf<{ id: string } | undefined>()
          return true
        },
        zod: (data) => {
          expectTypeOf(data).toEqualTypeOf<{
            resourceId: string
          }>()
          return true
        },
      },
    })

    expect(permix.check('resource.zod', { resourceId: 'resource-1' })).toBe(
      true
    )
  })

  it('keeps validator objects out of the JSON catalog', () => {
    const json = renderPermissionCatalog({
      schemaVersion: 1,
      permissions: [
        {
          key: 'resource.zod',
          references: [],
        },
      ],
    })

    expect(json).not.toContain('"schema":')
    expect(json).not.toContain('"validator":')
  })
})
