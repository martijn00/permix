import { cookies } from 'next/headers'

export type DemoUser = 'alice' | 'bob'

export async function getUser(): Promise<DemoUser> {
  const store = await cookies()
  const value = store.get('demo-user')?.value
  return value === 'bob' ? 'bob' : 'alice'
}
