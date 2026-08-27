const entrypoints = [
  ['.', await import('permix'), ['createPermix']],
  ['./trpc', await import('permix/trpc'), ['createPermix']],
  ['./orpc', await import('permix/orpc'), ['createPermix']],
  ['./express', await import('permix/express'), ['createPermix']],
  ['./hono', await import('permix/hono'), ['createPermix']],
  ['./node', await import('permix/node'), ['createPermix']],
  ['./server', await import('permix/server'), ['createPermix']],
  ['./elysia', await import('permix/elysia'), ['createPermix']],
  ['./fastify', await import('permix/fastify'), ['createPermix']],
  ['./drizzle', await import('permix/drizzle'), ['createPermix']],
  ['./drizzle/legacy', await import('permix/drizzle/legacy'), ['createPermix']],
  ['./effect', await import('permix/effect'), ['createPermix']],
] as const

for (const [subpath, module, expectedExports] of entrypoints) {
  for (const exportName of expectedExports) {
    if (!(exportName in module)) {
      throw new Error(
        `Missing ${exportName} export from permix${subpath === '.' ? '' : subpath}`
      )
    }
  }
}
