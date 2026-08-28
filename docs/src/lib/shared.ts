export const appName = 'Permix'
export const siteUrl = 'https://permix.letstri.dev'
export const docsRoute = '/docs'

export const gitConfig = {
  user: 'letstri',
  repo: 'permix',
  branch: 'main',
}

export function docsGithubUrl(path: string) {
  const base = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}`
  if (path === 'changelog.mdx' || path === 'changelog.md') {
    return `${base}/CHANGELOG.md`
  }
  return `${base}/docs/content/docs/${path}`
}
