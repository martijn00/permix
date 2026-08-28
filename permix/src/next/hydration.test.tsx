import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPermix as createCorePermix } from '../core'
import { PermixHydrate, PermixProvider, usePermix } from '../react'
import { createPermix as createNextPermix } from './permix'
import { resetRequestCache } from './request-cache-mock'
import '@testing-library/jest-dom/vitest'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  const { createRequestScopedCache } = await import('./request-cache-mock')
  return {
    ...actual,
    cache: createRequestScopedCache,
  }
})

describe('next → react hydration round-trip', () => {
  afterEach(() => {
    resetRequestCache()
  })

  it('hydrates dehydrated server state on the client', async () => {
    const permixServer = createNextPermix<{
      post: ['create', 'read']
    }>(() => ({
      post: {
        create: true,
        read: false,
      },
    }))

    const state = await permixServer.dehydrate()

    const permixClient = createCorePermix<{
      post: ['create', 'read']
    }>()

    function PostStatus() {
      const { check } = usePermix(permixClient)
      return (
        <div>
          <span data-testid="create">{String(check('post.create'))}</span>
          <span data-testid="read">{String(check('post.read'))}</span>
        </div>
      )
    }

    const { getByTestId } = render(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={state}>
          <PostStatus />
        </PermixHydrate>
      </PermixProvider>
    )

    expect(getByTestId('create')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('false')
  })
})
