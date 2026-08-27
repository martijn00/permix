import { onMounted, ref } from 'vue'

export interface User {
  id: string
  name: string
}

export function useUser() {
  const user = ref<User | null>(null)

  onMounted(() => {
    // Simulate a network request
    new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
      user.value = {
        id: Math.random() < 0.5 ? '1' : '2',
        name: 'John Doe',
      }
    })
  })

  return user
}
