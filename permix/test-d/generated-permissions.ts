import { createPermissionConfig, createPermissionOverlay } from 'permix'
import type {
  ApplyPermissionOverlay,
  Definition as PermixDefinition,
} from 'permix'

export type { PermissionReference } from 'permix/extractor'

export const permissionKeys = [
  'tasks.comment',
  'tasks.read',
  'workspace.members.invite',
] as const

export type Permission = (typeof permissionKeys)[number]

export const permissions = {
  tasks: {
    comment: 'tasks.comment',
    read: 'tasks.read',
  },
  workspace: {
    members: {
      invite: 'workspace.members.invite',
    },
  },
} as const

export const permissionMetadata = {
  'tasks.comment': {},
  'tasks.read': {},
  'workspace.members.invite': {},
} as const

export const permissionDefinition = {
  tasks: ['comment', 'read'],
  workspace: {
    members: ['invite'],
  },
} as const

export type ExtractedDefinition = typeof permissionDefinition

export type Definition<Overlay extends PermixDefinition = ExtractedDefinition> =
  ApplyPermissionOverlay<ExtractedDefinition, Overlay>

export const definePermissionConfig = createPermissionConfig<Permission>()

export const definePermissionOverlay =
  createPermissionOverlay<ExtractedDefinition>()
