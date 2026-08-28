import { action, createPermix } from 'permix'
import { z } from 'zod'

import type { Definition } from './permissions.generated'
import { definePermissionOverlay, permissions } from './permissions.generated'

const taskSchema = z.object({
  taskId: z.string(),
})

const overlay = definePermissionOverlay({
  tasks: [
    action('comment', taskSchema, { required: true }),
    action('delete', taskSchema, { required: true }),
  ],
})

type AppDefinition = Definition<typeof overlay>

export const permix = createPermix<AppDefinition>().setup({
  tasks: {
    comment: ({ taskId }) => taskId.length > 0,
    delete: ({ taskId }) => taskId.length > 0,
    read: true,
  },
  workspace: {
    members: {
      invite: true,
    },
  },
})

export function canComment(taskId: string): boolean {
  return permix.check(permissions.tasks.comment, { taskId })
}
