import { render, waitFor } from '@testing-library/react'
import * as React from 'react'
// @ts-expect-error react-dom/server has no types under tsconfig.react.json `types: []`
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { createPermix, PermixRuleNotDefinedError } from '../core'
import { createComponents, PermixHydrate, PermixProvider } from './components'
import { usePermix } from './hooks'

describe('components', () => {
  it('should check hydration', async () => {
    const permixServer = createPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()

    const permixClient = createPermix<{
      post: ['create', 'read']
    }>()

    const TestComponent = () => {
      const { check } = usePermix(permixClient)
      return <div>{check('post.create').toString()}</div>
    }

    const { container } = render(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={dehydrated}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>
    )

    expect(container.firstChild).toHaveTextContent('true')
  })

  it('uses dehydrated rules on the first render without mutating the instance', () => {
    const permixServer = createPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()
    const permixClient = createPermix<{
      post: ['create', 'read']
    }>()

    function TestComponent() {
      const { check, isReady } = usePermix(permixClient)
      return <div>{`${check('post.create')}:${isReady}`}</div>
    }

    const html = renderToString(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={dehydrated}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>
    )

    expect(html).toContain('true:false')
    expect(permixClient.getRules()).toBeNull()
    expect(permixClient.isReady()).toBe(false)
  })

  it('keeps isReady false after hydration until client setup', async () => {
    const permixServer = createPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()
    const permixClient = createPermix<{
      post: ['create', 'read']
    }>()

    function TestComponent() {
      const { check, isReady } = usePermix(permixClient)
      return (
        <div>
          <span data-testid="hydrate-create">
            {check('post.create').toString()}
          </span>
          <span data-testid="hydrate-ready">{isReady.toString()}</span>
        </div>
      )
    }

    const { getByTestId } = render(
      <React.StrictMode>
        <PermixProvider permix={permixClient}>
          <PermixHydrate state={dehydrated}>
            <TestComponent />
          </PermixHydrate>
        </PermixProvider>
      </React.StrictMode>
    )

    expect(getByTestId('hydrate-create')).toHaveTextContent('true')
    expect(getByTestId('hydrate-ready')).toHaveTextContent('false')

    permixClient.setup({
      post: {
        create: true,
        read: false,
      },
    })

    await waitFor(() => {
      expect(getByTestId('hydrate-ready')).toHaveTextContent('true')
    })
  })

  it('replaces hydrated booleans when setup supplies new rules', async () => {
    const permixServer = createPermix<{
      post: ['create', 'read']
    }>()

    permixServer.setup({
      post: {
        create: true,
        read: false,
      },
    })

    const dehydrated = permixServer.dehydrate()
    const permixClient = createPermix<{
      post: ['create', 'read']
    }>()

    function TestComponent() {
      const { check } = usePermix(permixClient)
      return (
        <div>
          <span data-testid="replace-create">
            {check('post.create').toString()}
          </span>
          <span data-testid="replace-read">
            {check('post.read').toString()}
          </span>
        </div>
      )
    }

    const { getByTestId } = render(
      <PermixProvider permix={permixClient}>
        <PermixHydrate state={dehydrated}>
          <TestComponent />
        </PermixHydrate>
      </PermixProvider>
    )

    expect(getByTestId('replace-create')).toHaveTextContent('true')
    expect(getByTestId('replace-read')).toHaveTextContent('false')

    permixClient.setup({
      post: {
        create: false,
        read: true,
      },
    })

    await waitFor(() => {
      expect(getByTestId('replace-create')).toHaveTextContent('false')
      expect(getByTestId('replace-read')).toHaveTextContent('true')
    })
  })

  it('should work with Check component', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const text = 'Post can be created'

    const { Check } = createComponents(permix)

    const TestPost = () => (
      <Check path="post.create">
        <div>{text}</div>
      </Check>
    )

    const { getByText } = render(
      <PermixProvider permix={permix}>
        <TestPost />
      </PermixProvider>
    )

    expect(getByText(text)).toBeInTheDocument()
  })

  it('should work with Check component and data', () => {
    const permix = createPermix<{
      post: [{ name: 'edit'; type: { authorId: string } }]
    }>()

    permix.setup({
      post: {
        edit: (post) => post?.authorId === '1',
      },
    })

    const canText = 'Post can be created'
    const cannotText = 'Post cannot be created'

    const { Check } = createComponents(permix)

    const TestPost1 = () => (
      <Check path="post.edit" data={{ authorId: '1' }}>
        <div data-testid="post-can-be-created">{canText}</div>
      </Check>
    )

    const { container: container1 } = render(
      <PermixProvider permix={permix}>
        <TestPost1 />
      </PermixProvider>
    )

    expect(container1.innerHTML).toContain(canText)

    const TestPost2 = () => (
      <Check
        path="post.edit"
        data={{ authorId: '2' }}
        otherwise={<div data-testid="otherwise">{cannotText}</div>}
      >
        <div data-testid="post-can-be-created">{canText}</div>
      </Check>
    )

    const { container: container2 } = render(
      <PermixProvider permix={permix}>
        <TestPost2 />
      </PermixProvider>
    )

    expect(container2.innerHTML).not.toContain(canText)
    expect(container2.innerHTML).toContain(cannotText)
  })

  it('should work with Check component and DOM rerender', async () => {
    const permix = createPermix<{
      post: ['read']
    }>()

    permix.setup({
      post: {
        read: false,
      },
    })

    const text = 'Post can be read'

    const { Check } = createComponents(permix)

    const TestComponent = () => (
      <Check path="post.read">
        <span data-testid="read">{text}</span>
      </Check>
    )

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
    )

    expect(container.innerHTML).not.toContain(text)

    permix.setup({
      post: {
        read: true,
      },
    })

    await waitFor(() => {
      expect(container.innerHTML).toContain(text)
    })
  })

  it('should work with reverse prop', async () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const defaultText = 'Default slot'
    const otherwiseText = 'Otherwise slot'

    const { Check } = createComponents(permix)

    const TestComponent = () => (
      <Check path="post.create" reverse otherwise={<div>{otherwiseText}</div>}>
        <div>{defaultText}</div>
      </Check>
    )

    const { container } = render(
      <PermixProvider permix={permix}>
        <TestComponent />
      </PermixProvider>
    )

    expect(container.innerHTML).not.toContain(defaultText)
    expect(container.innerHTML).toContain(otherwiseText)

    permix.setup({
      post: {
        create: false,
      },
    })

    await waitFor(() => {
      expect(container.innerHTML).toContain(defaultText)
      expect(container.innerHTML).not.toContain(otherwiseText)
    })
  })

  it('should validate ts props', () => {
    const permix = createPermix<{
      post: ['create']
    }>()

    permix.setup({
      post: {
        create: true,
      },
    })

    const { Check } = createComponents(permix)

    const TestEntityComponent = () => (
      // @ts-expect-error path does not exist
      <Check path="not-exist">
        <div>Entity prop</div>
      </Check>
    )

    const TestActionComponent = () => (
      // @ts-expect-error path does not exist
      <Check path="post.not-exist">
        <div>Action prop</div>
      </Check>
    )

    expect(() =>
      render(
        <PermixProvider permix={permix}>
          <TestEntityComponent />
        </PermixProvider>
      )
    ).toThrow(PermixRuleNotDefinedError)

    expect(() =>
      render(
        <PermixProvider permix={permix}>
          <TestActionComponent />
        </PermixProvider>
      )
    ).toThrow(PermixRuleNotDefinedError)
  })
})
