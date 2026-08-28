// A type alias preserves compatibility with Permix's recursive Definition constraint.
// oxlint-disable-next-line typescript/consistent-type-definitions
export type PermissionDefinition = {
  documents: [
    'read',
    {
      name: 'update'
      type: { ownerId: string }
      required: true
    },
  ]
}

export interface ExampleSession {
  session: {
    id: string
    userId: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    token: string
    ipAddress?: string | null
    userAgent?: string | null
  }
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
  }
}
