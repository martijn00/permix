import { action, createPermix } from 'permix'
import { createPermix as createNextPermix } from 'permix/next'
import { createPermix as createReactPermix } from 'permix/react'
import { z } from 'zod'

import {
  definePermissionConfig,
  definePermissionOverlay,
  permissions,
} from './generated-permissions'
import type { Definition } from './generated-permissions'

const metadata = definePermissionConfig({
  'tasks.comment': {
    title: 'Comment on tasks',
  },
})

const taskSchema = z.object({
  taskId: z.string(),
})

const overlay = definePermissionOverlay({
  tasks: [
    action('comment', taskSchema, {
      required: true,
    }),
  ],
})

type AppDefinition = Definition<typeof overlay>

const core = createPermix<AppDefinition>()
const react = createReactPermix<AppDefinition>()
const next = createNextPermix<AppDefinition>(() => ({
  tasks: {
    comment: ({ taskId }) => taskId.length > 0,
    read: true,
  },
  workspace: {
    members: {
      invite: true,
    },
  },
}))

core.setup({
  tasks: {
    comment: ({ taskId }) => taskId.length > 0,
    read: true,
  },
  workspace: {
    members: {
      invite: true,
    },
  },
})

core.check(permissions.tasks.comment, { taskId: 'task-1' })
core.check(permissions.tasks.read)
core.check('tasks.~any')
core.check('workspace.~all')
core.check('~any')
core.check('~all')

// @ts-expect-error Required overlay payload data cannot be omitted.
core.check(permissions.tasks.comment)

// @ts-expect-error Unknown permissions are rejected by central metadata config.
definePermissionConfig({ 'tasks.delete': { title: 'Delete tasks' } })

export { core, metadata, next, react }
