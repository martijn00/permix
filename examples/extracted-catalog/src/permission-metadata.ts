import { definePermissionConfig } from './permissions.generated'

export const permissionMetadata = definePermissionConfig({
  'tasks.comment': {
    title: 'Comment on a task',
    description: 'Add comments from the task page, public API, or an AI tool.',
  },
  'tasks.delete': {
    title: 'Delete a task',
    description: 'Permanently delete a task.',
  },
  'tasks.read': {
    title: 'Read tasks',
  },
  'workspace.members.invite': {
    title: 'Invite workspace members',
  },
})
