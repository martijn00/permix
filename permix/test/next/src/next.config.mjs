import { withPermix } from 'permix/next/config'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['permix'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withPermix(nextConfig, {
  include: ['app/**/*.{ts,tsx}'],
  watch: false,
})
