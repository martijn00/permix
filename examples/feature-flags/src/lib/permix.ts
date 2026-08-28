import { createPermix } from 'permix/react'

import { getUser } from './user'

export const { permix, PermixProvider, usePermix, Check } = createPermix<{
  darkMode: ['enabled']
  betaFeatures: ['newUI', 'experimentalAPI']
}>()

// Define the feature flags for each role
export const betaUserFeatures = permix.template({
  darkMode: {
    enabled: true,
  },
  betaFeatures: {
    newUI: true,
    experimentalAPI: true,
  },
})

export const regularUserFeatures = permix.template({
  darkMode: {
    enabled: true,
  },
  betaFeatures: {
    newUI: false,
    experimentalAPI: false,
  },
})

export async function setupFeatureFlags() {
  const user = await getUser()

  const featureConfig = user.isBetaUser
    ? betaUserFeatures()
    : regularUserFeatures()

  permix.setup(featureConfig)
}
