import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['permix'],
  cacheComponents: true,
  partialPrefetching: true,
  experimental:
    process.env.EXPOSE_TESTING_API === '1'
      ? {
          exposeTestingApiInProductionBuild: true,
        }
      : undefined,
}

export default nextConfig
