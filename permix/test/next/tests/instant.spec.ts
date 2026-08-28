import { instant } from '@next/playwright'
import { expect, test, type Page } from '@playwright/test'

async function setUser(page: Page, user: 'alice' | 'bob') {
  const baseURL = test.info().project.use.baseURL
  if (!baseURL) {
    throw new Error('BASE_URL is required')
  }
  const url = new URL(baseURL)
  await page.context().addCookies([
    {
      name: 'demo-user',
      value: user,
      domain: url.hostname,
      path: '/',
    },
  ])
}

function dashboardMain(page: Page) {
  return page
    .locator('main')
    .filter({ has: page.getByTestId('dashboard-shell') })
}

test.describe('next 16.3 instant navigation', () => {
  test('cache-safe permission UI is present under the lock', async ({
    page,
    baseURL,
  }) => {
    await setUser(page, 'alice')
    await instant(
      page,
      async () => {
        await page.goto('/acme')
        await expect(page.getByTestId('app-shell')).toBeVisible()
        await expect(page.getByTestId('tenant-shell')).toBeVisible()
        await expect(page.getByText('acme:create-allowed')).toBeVisible()
      },
      { baseURL }
    )
  })

  test('cold session island is gated then streams', async ({ page }) => {
    await setUser(page, 'alice')
    await page.goto('/acme')
    await expect(page.getByTestId('tenant-home')).toBeVisible()

    const dest = dashboardMain(page)
    await instant(page, async () => {
      await page.getByTestId('dashboard-link').click()
      await expect(dest.getByTestId('dashboard-shell')).toBeVisible()
      await expect(dest.getByTestId('session-island')).toHaveCount(0)
    })

    await expect(dest.getByTestId('session-island')).toBeVisible()
  })

  test('primed private payload is present immediately', async ({ page }) => {
    await setUser(page, 'alice')
    await page.goto('/acme')
    await expect(page.getByTestId('private-edit')).toHaveText(
      'alice:edit-allowed'
    )

    const dest = dashboardMain(page)
    await instant(page, async () => {
      await page.getByTestId('dashboard-prefetch-link').click()
      await expect(dest.getByTestId('dashboard-shell')).toBeVisible()
      await expect(dest.getByTestId('private-edit')).toHaveText(
        'alice:edit-allowed'
      )
    })
  })

  test('default shared-shell navigation keeps tenant chrome instant', async ({
    page,
  }) => {
    await setUser(page, 'alice')
    await page.goto('/acme')
    await expect(page.getByTestId('tenant-home')).toBeVisible()

    await instant(page, async () => {
      await page.getByTestId('globex-link').click()
      await expect(page.getByTestId('tenant-shell')).toBeVisible()
      await expect(page.getByText('globex:create-denied')).toBeVisible()
    })
  })

  test('prefetch=true root-param navigation includes tenant-keyed UI', async ({
    page,
  }) => {
    await setUser(page, 'alice')
    await page.goto('/acme')
    await expect(page.getByTestId('tenant-home')).toBeVisible()

    await instant(page, async () => {
      await page.getByTestId('globex-prefetch-link').click()
      await expect(page.getByTestId('tenant-shell')).toBeVisible()
      await expect(page.getByText('globex:create-denied')).toBeVisible()
    })
  })
})
