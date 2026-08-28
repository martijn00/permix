import { checkPermissions, generatePermissions } from 'permix/extractor'

import { permissionMetadata } from './permission-metadata'

const options = {
  catalogOutput: 'permissions.generated.json',
  metadata: permissionMetadata,
  moduleOutput: 'src/permissions.generated.ts',
} as const

if (process.argv.includes('--check')) {
  const result = await checkPermissions(options)
  if (!result.valid) {
    throw new Error(`Stale artifacts: ${result.stale.join(', ')}`)
  }
} else {
  await generatePermissions(options)
}
