'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import type { DemoRole } from '@/lib/auth'

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
