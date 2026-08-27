export async function getUser() {
  // It can be any async function such as fetching from database
  return {
    id: '1',
    role: 'admin' as const,
  }
}
