import { expect, test, type Page } from '@playwright/test'

const homePath =
  process.env.PERMIX_NEXT_VERSION === '16.3.3' ? '/acme' : '/'

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

test.describe('next adapter request state', () => {
  test('concurrent RSC callers share one initialized instance', async ({
    page,
  }) => {
    await setUser(page, 'alice')
    await page.goto(homePath)
    await expect(page.getByTestId('instance-a')).not.toHaveText('')
    await expect(page.getByTestId('instance-b')).toHaveText(
      await page.getByTestId('instance-a').innerText()
    )
    await expect(page.getByTestId('use-permix-create')).toHaveText('allowed')
    await expect(page.getByTestId('session-create')).toHaveText('allowed')
    await expect(page.getByTestId('public-read')).toHaveText('allowed')
  })

  test('concurrent requests stay isolated', async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('BASE_URL is required')
    }
    const url = new URL(baseURL)

    async function openAs(user: 'alice' | 'bob') {
      const context = await browser.newContext()
      await context.addCookies([
        {
          name: 'demo-user',
          value: user,
          domain: url.hostname,
          path: '/',
        },
      ])
      const page = await context.newPage()
      await page.goto(homePath)
      return { context, page }
    }

    const alice = await openAs('alice')
    const bob = await openAs('bob')

    await expect(alice.page.getByTestId('session-create')).toHaveText('allowed')
    await expect(bob.page.getByTestId('session-create')).toHaveText('denied')
    await expect(alice.page.getByTestId('use-permix-create')).toHaveText(
      'allowed'
    )
    await expect(bob.page.getByTestId('use-permix-create')).toHaveText('denied')

    await alice.context.close()
    await bob.context.close()
  })

  test('route handler sets up an explicit core instance', async ({
    page,
    baseURL,
  }) => {
    await setUser(page, 'alice')
    const alice = await page.request.get(`${baseURL}/api/check`)
    expect(await alice.json()).toEqual({ create: true, read: true })

    await page.context().clearCookies()
    await setUser(page, 'bob')
    const bob = await page.request.get(`${baseURL}/api/check`)
    expect(await bob.json()).toEqual({ create: false, read: true })
  })

  test('server action sets up an explicit core instance', async ({ page }) => {
    await setUser(page, 'alice')
    await page.goto(homePath)
    await page.getByTestId('action-check').click()
    await expect(page.getByTestId('action-result')).toHaveText('allowed')

    await page.context().clearCookies()
    await setUser(page, 'bob')
    await page.reload()
    await page.getByTestId('action-check').click()
    await expect(page.getByTestId('action-result')).toHaveText('denied')
  })
})
