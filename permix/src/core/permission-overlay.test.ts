import { describe, expect, expectTypeOf, it } from 'vitest'

import type { ActionData } from './definitions'
import { createPermissionOverlay } from './permission-overlay'
import type {
  ApplyPermissionOverlay,
  UnknownPermissionOverlayPaths,
} from './permission-overlay'
import type { RulesPaths } from './permix'

const extractedDefinition = {
  projects: ['read', 'update'],
  workspace: {
    members: ['invite'],
  },
} as const

describe(createPermissionOverlay, () => {
  it('preserves payload types for matching extracted permissions', () => {
    const defineOverlay = createPermissionOverlay<typeof extractedDefinition>()
    const overlay = defineOverlay({
      projects: [
        {
          name: 'update',
          type: {} as { projectId: string },
        },
      ],
    })

    type Definition = ApplyPermissionOverlay<
      typeof extractedDefinition,
      typeof overlay
    >

    expect(overlay.projects[0]?.name).toBe('update')
    expectTypeOf<RulesPaths<Definition>>().toEqualTypeOf<
      'projects.read' | 'projects.update' | 'workspace.members.invite'
    >()
    expectTypeOf<ActionData<Definition['projects'][1]>>().toEqualTypeOf<{
      projectId: string
    }>()
  })

  it('reports overlay paths that are absent from extracted source', () => {
    type Unknown = UnknownPermissionOverlayPaths<
      typeof extractedDefinition,
      {
        projects: ['delete']
        workspace: {
          members: ['remove']
        }
      }
    >

    expectTypeOf<Unknown>().toEqualTypeOf<
      'projects.delete' | 'workspace.members.remove'
    >()

    function invalidOverlayExample() {
      const defineOverlay =
        createPermissionOverlay<typeof extractedDefinition>()

      // @ts-expect-error Overlay paths must exist in the extracted definition.
      defineOverlay({ projects: ['delete'] })
    }

    expectTypeOf(invalidOverlayExample).toBeFunction()
  })
})
