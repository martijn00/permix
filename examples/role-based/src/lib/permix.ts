import { createPermix } from 'permix/react'

import { getUser } from './user'

export const { permix, PermixProvider, usePermix, Check } = createPermix<{
  post: ['create', 'read', 'update', 'delete']
  user: ['create', 'read', 'update', 'delete']
}>()

// Define the permissions for each role
export const adminPermissions = permix.template({
  post: {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
  user: {
    create: true,
    read: true,
    update: true,
    delete: true,
  },
})

export const userPermissions = permix.template({
  post: {
    read: true,
    update: true,
    delete: false,
    create: false,
  },
  user: {
    read: true,
    update: true,
    delete: false,
    create: false,
  },
})

export async function setupPermissions() {
  const user = await getUser()

  const rolesMap = {
    admin: () => adminPermissions(),
    user: () => userPermissions(),
  }

  permix.setup(rolesMap[user.role]())
}
