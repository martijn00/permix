import { permission } from 'permix'

export const taskPermissions = {
  comment: permission({
    key: 'tasks.comment',
    tags: ['tasks', 'collaboration'],
    annotations: {
      area: 'work-management',
      risk: 'standard',
      surfaces: ['task-page', 'api', 'ai-tool'],
    },
  }),
  delete: permission({
    key: 'tasks.delete',
    annotations: {
      area: 'work-management',
      risk: 'elevated',
      surfaces: ['task-page', 'api'],
    },
  }),
  read: permission('tasks.read'),
} as const

export const inviteMember = permission({
  key: 'workspace.members.invite',
  annotations: {
    area: 'organization',
    risk: 'elevated',
  },
})
