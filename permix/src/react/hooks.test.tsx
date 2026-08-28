import { act, render, renderHook, waitFor } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createPermix } from '../core'
import { PermixProvider, usePermix } from './index'
import '@testing-library/jest-dom/vitest'

describe('permix react', () => {
  it('should work with custom hook', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup({
      post: {
        create: true,
        read: false,
      },
    })

    const usePermissions = () => usePermix(permix)

    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => (
        <PermixProvider permix={permix}>{children}</PermixProvider>
      ),
    })

    expect(result.current.check('post.create')).toBe(true)
    expect(result.current.check('post.read')).toBe(false)
  })

  it('rerenders full usePermix consumers when any rule changes', () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>().setup({
      post: {
        create: true,
        read: false,
      },
    })

    const onRender = vi.fn()

    function TestComponent() {
      onRender()
      const { check } = usePermix(permix)
      return <div>{check('post.create').toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
    )

    expect(container.firstChild).toHaveTextContent('true')
    expect(onRender).toHaveBeenCalledOnce()

    act(() => {
      permix.setup({
        post: {
          create: true,
          read: true,
        },
      })
    })

    expect(container.firstChild).toHaveTextContent('true')
    expect(onRender).toHaveBeenCalledTimes(2)
  })

  it('reads ready state on the first render when setup ran before subscribe', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: {
        create: true,
      },
    })

    function TestComponent() {
      const { isReady, check } = usePermix(permix)
      return (
        <div>
          {isReady.toString()}:{check('post.create').toString()}
        </div>
      )
    }

    const { container } = render(
      <React.StrictMode>
        <PermixProvider permix={permix}>
          <TestComponent />
        </PermixProvider>
      </React.StrictMode>
    )

    expect(container.firstChild).toHaveTextContent('true:true')
  })

  it('should work with DOM rerender', async () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>().setup({
      post: {
        create: (post) => post?.id === '1',
        read: false,
      },
    })

    const TestComponent = () => {
      const { check } = usePermix(permix)

      const post = { id: '1' }

      return (
        <div>
          <span data-testid="create">
            {check('post.create', post).toString()}
          </span>
          <span data-testid="read">{check('post.read').toString()}</span>
        </div>
      )
    }

    const { getByTestId } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
    )

    expect(getByTestId('create')).toHaveTextContent('true')
    expect(getByTestId('read')).toHaveTextContent('false')

    permix.setup({
      post: {
        create: (post) => post?.id === '2',
        read: true,
      },
    })

    await waitFor(() => {
      expect(getByTestId('create')).toHaveTextContent('false')
      expect(getByTestId('read')).toHaveTextContent('true')
    })
  })

  it('should check isReady', async () => {
    const permix = createPermix<{
      post: ['create', 'read']
    }>()

    const TestComponent = () => {
      const { isReady } = usePermix(permix)
      return <div>{isReady.toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
    )

    expect(container.firstChild).toHaveTextContent('false')

    permix.setup({
      post: {
        create: true,
        read: false,
      },
    })

    await waitFor(() => {
      expect(container.firstChild).toHaveTextContent('true')
    })
  })

  it('should throw error when PermixProvider is missing', () => {
    const permix = createPermix<{
      post: [{ name: 'create'; type: { id: string } }, 'read']
    }>()

    const TestComponent = () => {
      const { check } = usePermix(permix)
      return <div>{check('post.create').toString()}</div>
    }

    expect(() => render(<TestComponent />)).toThrow()
  })

  it('runs UI check through the instance so check hooks fire', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: { create: true },
    })

    const onCheck = vi.fn()
    permix.hook('check', onCheck)

    const { result } = renderHook(() => usePermix(permix), {
      wrapper: ({ children }) => (
        <PermixProvider permix={permix}>{children}</PermixProvider>
      ),
    })

    expect(result.current.check('post.create')).toBe(true)
    expect(onCheck).toHaveBeenCalledOnce()
    expect(onCheck).toHaveBeenCalledWith({
      path: 'post.create',
      allowed: true,
      reasons: [],
    })
  })

  it('exposes explain() for UI denial reasons', () => {
    const permix = createPermix<{
      post: ['create']
    }>().setup({
      post: {
        create: () => ({ allow: false, reason: 'not an author' }),
      },
    })

    const { result } = renderHook(() => usePermix(permix), {
      wrapper: ({ children }) => (
        <PermixProvider permix={permix}>{children}</PermixProvider>
      ),
    })

    expect(result.current.check('post.create')).toBe(false)
    expect(result.current.explain('post.create')).toStrictEqual({
      allowed: false,
      path: 'post.create',
      reasons: ['not an author'],
    })
  })
})
