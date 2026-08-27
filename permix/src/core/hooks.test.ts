import { describe, expect, it, vi } from 'vitest'

import { createHooks } from './hooks'

describe('createHooks', () => {
  it('should register and call hooks', () => {
    const { hook, callHook } = createHooks()
    const mockFn = vi.fn()

    hook('test', mockFn)
    callHook('test', 'arg1', 'arg2')

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should allow removing hooks', () => {
    const { hook, callHook } = createHooks()
    const mockFn = vi.fn()

    const remove = hook('test', mockFn)
    remove()
    callHook('test', 'arg')

    expect(mockFn).not.toHaveBeenCalled()
  })

  it('should handle hookOnce correctly', () => {
    const { hookOnce, callHook } = createHooks()
    const mockFn = vi.fn()

    hookOnce('test', mockFn)
    callHook('test', 'arg1')
    callHook('test', 'arg2')

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg1')
  })

  it('should remove specific hooks with removeHook', () => {
    const { hook, removeHook, callHook } = createHooks()
    const mockFn1 = vi.fn()
    const mockFn2 = vi.fn()

    hook('test', mockFn1)
    hook('test', mockFn2)
    removeHook('test', mockFn1)
    callHook('test', 'arg')

    expect(mockFn1).not.toHaveBeenCalled()
    expect(mockFn2).toHaveBeenCalledWith('arg')
  })

  it('should clear specific hooks with clearHook', () => {
    const { hook, clearHook, callHook } = createHooks()
    const mockFn = vi.fn()

    hook('test', mockFn)
    clearHook('test')
    callHook('test', 'arg')

    expect(mockFn).not.toHaveBeenCalled()
  })

  it('should clear all hooks with clearAllHooks', () => {
    const { hook, clearAllHooks, callHook } = createHooks()
    const mockFn1 = vi.fn()
    const mockFn2 = vi.fn()

    hook('test1', mockFn1)
    hook('test2', mockFn2)
    clearAllHooks()
    callHook('test1', 'arg')
    callHook('test2', 'arg')

    expect(mockFn1).not.toHaveBeenCalled()
    expect(mockFn2).not.toHaveBeenCalled()
  })

  it('should handle multiple hooks for the same event', () => {
    const { hook, callHook } = createHooks()
    const mockFn1 = vi.fn()
    const mockFn2 = vi.fn()

    hook('test', mockFn1)
    hook('test', mockFn2)
    callHook('test', 'arg')

    expect(mockFn1).toHaveBeenCalledWith('arg')
    expect(mockFn2).toHaveBeenCalledWith('arg')
  })

  it('should safely handle calling non-existent hooks', () => {
    const { callHook } = createHooks()
    expect(() => callHook('nonexistent', 'arg')).not.toThrow()
  })

  it('should call hooks with generic', () => {
    const { hook, callHook } = createHooks<{
      test: (arg: string) => void
    }>()

    const mockFn = vi.fn()

    hook('test', mockFn)
    callHook('test', 'arg')

    expect(mockFn).toHaveBeenCalledWith('arg')
  })
})
