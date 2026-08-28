import type { CheckArgs } from 'permix'
import { createPermix } from 'permix'
import { createPermix as createDrizzlePermix } from 'permix/drizzle'
import { createPermix as createDrizzleLegacyPermix } from 'permix/drizzle/legacy'
import { createPermix as createEffectPermix } from 'permix/effect'
import { createPermix as createElysiaPermix } from 'permix/elysia'
import { createPermix as createExpressPermix } from 'permix/express'
import { createPermix as createFastifyPermix } from 'permix/fastify'
import { createPermix as createHonoPermix } from 'permix/hono'
import { createPermix as createNextPermix } from 'permix/next'
import { createPermix as createNodePermix } from 'permix/node'
import { createPermix as createOrpcPermix } from 'permix/orpc'
import {
  createPdpClient,
  createPdpHandler,
  createPdpOpenApiDocument,
} from 'permix/pdp'
import {
  createComponents as createReactComponents,
  createPermix as createReactPermix,
} from 'permix/react'
import { createPermix as createServerPermix } from 'permix/server'
import { createComponents as createSolidComponents } from 'permix/solid'
import { createComponents as createSvelteComponents } from 'permix/svelte'
import { createPermix as createTanstackStartPermix } from 'permix/tanstack-start'
import { createPermix as createTrpcPermix } from 'permix/trpc'
import { createComponents as createVueComponents } from 'permix/vue'

type PostDefinition = {
  post: ['create', 'read']
}

const core = createPermix<PostDefinition>()
const react = createReactComponents(core)
const reactFactory = createReactPermix(core)
const reactStandalone = createReactPermix<PostDefinition>()
const vue = createVueComponents(core)
const trpc = createTrpcPermix<PostDefinition>()
const orpc = createOrpcPermix<PostDefinition>()
const express = createExpressPermix<PostDefinition>()
const hono = createHonoPermix<PostDefinition>()
const node = createNodePermix<PostDefinition>()
const server = createServerPermix<PostDefinition>()
const elysia = createElysiaPermix<PostDefinition>()
const fastify = createFastifyPermix<PostDefinition>()
const solid = createSolidComponents(core)
const svelte = createSvelteComponents(core)
const drizzle = createDrizzlePermix({})
const drizzleLegacy = createDrizzleLegacyPermix({})
const effect = createEffectPermix<PostDefinition>()
const next = createNextPermix<PostDefinition>(() => ({
  post: {
    create: true,
    read: true,
  },
}))
const tanstackStart = createTanstackStartPermix<PostDefinition>()
const pdpClient = createPdpClient<PostDefinition>()
const pdpHandler = createPdpHandler<PostDefinition, string, string>({
  authenticateCaller: () => 'caller',
  authenticateService: () => 'service',
  resolveSubject: ({ subject }) => subject,
  resolveRules: () => ({
    post: {
      create: true,
      read: true,
    },
  }),
})
const pdpOpenApi = createPdpOpenApiDocument()

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
  drizzleLegacy,
  effect,
  elysia,
  express,
  factoryCheck,
  fastify,
  hono,
  next,
  node,
  orpc,
  pdpClient,
  pdpHandler,
  pdpOpenApi,
  react,
  reactFactory,
  reactStandalone,
  server,
  solid,
  svelte,
  tanstackStart,
  trpc,
  vue,
}
