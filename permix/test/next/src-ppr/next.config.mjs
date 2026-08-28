const exposeTestingApi = process.env.EXPOSE_TESTING_API === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['permix'],
  cacheComponents: true,
  partialPrefetching: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: exposeTestingApi
    ? {
        exposeTestingApiInProductionBuild: true,
      }
    : undefined,
}

export default nextConfig
