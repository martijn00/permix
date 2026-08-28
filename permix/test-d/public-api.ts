import type { CheckArgs } from 'permix'
import { createPermix } from 'permix'
import { createPermix as createDrizzlePermix } from 'permix/drizzle'
import { createPermix as createEffectPermix } from 'permix/effect'
import { createPermix as createElysiaPermix } from 'permix/elysia'
import { createPermix as createExpressPermix } from 'permix/express'
import { createPermix as createFastifyPermix } from 'permix/fastify'
import { createPermix as createHonoPermix } from 'permix/hono'
import { createPermix as createNextPermix } from 'permix/next'
import { createPermix as createNodePermix } from 'permix/node'
import { createPermix as createOrpcPermix } from 'permix/orpc'
import { createPermix as createReactPermix } from 'permix/react'
import { createPermix as createServerPermix } from 'permix/server'
import { createPermix as createSolidPermix } from 'permix/solid'
import { createPermix as createSveltePermix } from 'permix/svelte'
import { createPermix as createTanstackStartPermix } from 'permix/tanstack-start'
import { createPermix as createTrpcPermix } from 'permix/trpc'
import { createPermix as createVuePermix } from 'permix/vue'

type PostDefinition = {
  post: ['create', 'read']
}

const core = createPermix<PostDefinition>()
const reactFactory = createReactPermix(core)
const reactStandalone = createReactPermix<PostDefinition>()
const vue = createVuePermix(core)
const trpc = createTrpcPermix<PostDefinition>()
const orpc = createOrpcPermix<PostDefinition>()
const express = createExpressPermix<PostDefinition>()
const hono = createHonoPermix<PostDefinition>()
const node = createNodePermix<PostDefinition>()
const server = createServerPermix<PostDefinition>()
const elysia = createElysiaPermix<PostDefinition>()
const fastify = createFastifyPermix<PostDefinition>()
const solid = createSolidPermix(core)
const svelte = createSveltePermix(core)
const drizzle = createDrizzlePermix({})
const effect = createEffectPermix<PostDefinition>()
const next = createNextPermix<PostDefinition>(() => ({
  post: {
    create: true,
    read: true,
  },
}))
const tanstackStart = createTanstackStartPermix<PostDefinition>()

core.setup({
  post: {
    create: true,
    read: true,
  },
})

const checkArgs: CheckArgs<PostDefinition> = ['post.create']
const allowed = core.check(...checkArgs)
type FactoryCheck = ReturnType<(typeof reactFactory)['usePermix']>['check']
const factoryCheck: FactoryCheck = core.check

export {
  allowed,
  core,
  drizzle,
  effect,
  elysia,
  express,
  factoryCheck,
  fastify,
  hono,
  next,
  node,
  orpc,
  reactFactory,
  reactStandalone,
  server,
  solid,
  svelte,
  tanstackStart,
  trpc,
  vue,
}
