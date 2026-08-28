import { render, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { createPermix as createCore } from '../core'
import { createPermix } from './create-permix'
import { PermixProvider, usePermix } from './index'

describe('react factory contexts', () => {
  it('creates a core instance and bound UI when called with a definition', () => {
    const {
      permix,
      PermixProvider: BoundProvider,
      usePermix: useBoundPermix,
      Check,
    } = createPermix<{
      post: ['read']
    }>()

    permix.setup({
      post: {
        read: true,
      },
    })

    function HookLabel() {
      const { check, isReady } = useBoundPermix()
      return (
        <span data-testid="hook">{`${isReady}:${check('post.read')}`}</span>
      )
    }

    const { getByTestId, getByText } = render(
      <BoundProvider>
        <HookLabel />
        <Check path="post.read">
          <span>allowed</span>
        </Check>
      </BoundProvider>
    )

    expect(getByTestId('hook')).toHaveTextContent('true:true')
    expect(getByText('allowed')).toBeInTheDocument()
  })

  it('wraps an existing core instance', () => {
    const permix = createCore<{
      post: ['read']
    }>()

    permix.setup({
      post: {
        read: true,
      },
    })

    const ui = createPermix(permix)

    expect(ui.permix).toBe(permix)

    function HookLabel() {
      const { check } = ui.usePermix()
      return <span data-testid="wrap">{check('post.read').toString()}</span>
    }

    const { getByTestId } = render(
      <ui.PermixProvider>
        <HookLabel />
      </ui.PermixProvider>
    )

    expect(getByTestId('wrap')).toHaveTextContent('true')
  })

  it('keeps nested factory contexts independent', () => {
    const postsUI = createPermix<{
      post: ['read']
    }>()
    const commentsUI = createPermix<{
      comment: ['read']
    }>()

    postsUI.permix.setup({
      post: {
        read: true,
      },
    })
    commentsUI.permix.setup({
      comment: {
        read: false,
      },
    })

    function Nested() {
      const postsState = postsUI.usePermix()
      const commentsState = commentsUI.usePermix()
      return (
        <div>
          <span data-testid="post">
            {postsState.check('post.read').toString()}
          </span>
          <span data-testid="comment">
            {commentsState.check('comment.read').toString()}
          </span>
          <postsUI.Check path="post.read">
            <span data-testid="post-check">post-ok</span>
          </postsUI.Check>
          <commentsUI.Check path="comment.read">
            <span data-testid="comment-check">comment-ok</span>
          </commentsUI.Check>
        </div>
      )
    }

    const { getByTestId, queryByTestId } = render(
      <postsUI.PermixProvider>
        <commentsUI.PermixProvider>
          <Nested />
        </commentsUI.PermixProvider>
      </postsUI.PermixProvider>
    )

    expect(getByTestId('post')).toHaveTextContent('true')
    expect(getByTestId('comment')).toHaveTextContent('false')
    expect(getByTestId('post-check')).toHaveTextContent('post-ok')
    expect(queryByTestId('comment-check')).not.toBeInTheDocument()
  })

  it('hydrates through the factory overlay', async () => {
    const server = createCore<{
      post: ['create']
    }>()
    server.setup({
      post: {
        create: true,
      },
    })
    const state = server.dehydrate()

    const {
      permix: client,
      PermixProvider: BoundProvider,
      PermixHydrate: BoundHydrate,
      usePermix: useBoundPermix,
    } = createPermix<{
      post: ['create']
    }>()

    function Label() {
      const { check, isReady } = useBoundPermix()
      return (
        <span data-testid="hydrate">{`${check('post.create')}:${isReady}`}</span>
      )
    }

    const { getByTestId } = render(
      <BoundProvider>
        <BoundHydrate state={state}>
          <Label />
        </BoundHydrate>
      </BoundProvider>
    )

    expect(getByTestId('hydrate')).toHaveTextContent('true:false')

    client.setup({
      post: {
        create: true,
      },
    })

    await waitFor(() => {
      expect(getByTestId('hydrate')).toHaveTextContent('true:true')
    })
  })

  it('throws in development when the singleton hook receives a different instance', () => {
    const provided = createCore<{
      post: ['read']
    }>()
    const other = createCore<{
      post: ['read']
    }>()

    provided.setup({
      post: {
        read: true,
      },
    })

    function Mismatch() {
      const { check } = usePermix(other)
      return <span>{check('post.read').toString()}</span>
    }

    expect(() =>
      render(
        <PermixProvider permix={provided}>
          <Mismatch />
        </PermixProvider>
      )
    ).toThrow(/same instance/)
  })
})
