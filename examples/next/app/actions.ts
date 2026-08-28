'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createPermix } from 'permix'

import type { DemoRole } from '@/lib/auth'
import { getSession } from '@/lib/auth'
import type { PermissionsDefinition } from '@/lib/permissions'
import { rulesForSession } from '@/lib/permissions'

export async function switchRole(formData: FormData) {
  const role = formData.get('role')

  if (
    role !== 'guest' &&
    role !== 'alice' &&
    role !== 'bob' &&
    role !== 'admin'
  ) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set('demo-role', role satisfies DemoRole, { path: '/' })
  revalidatePath('/', 'layout')
}

export async function createPost() {
  const permix = createPermix<PermissionsDefinition>().setup(
    rulesForSession(await getSession())
  )

  if (!permix.check('post.create')) {
    return { ok: false as const, error: 'Forbidden' }
  }

  return { ok: true as const, message: 'Post created (demo)' }
}
