import { createPermixPlugin } from 'permix/next/config'

export const withPermix = createPermixPlugin({
  include: ['src/**/*.{ts,tsx}'],
  watch: false,
})
