import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('useLayoutEffect isomorphic alias', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('uses useLayoutEffect when window exists', async () => {
    const { useLayoutEffect } = await import('./use-isomorphic-layout-effect')
    expect(useLayoutEffect).toBe(React.useLayoutEffect)
  })

  it('falls back to useEffect when window is missing', async () => {
    vi.resetModules()
    vi.stubGlobal('window', undefined)
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    })
    delete (globalThis as { window?: unknown }).window

    const { useLayoutEffect } = await import('./use-isomorphic-layout-effect')
    expect(useLayoutEffect).toBe(React.useEffect)
  })
})
