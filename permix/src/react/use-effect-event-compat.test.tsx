import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { useEffectEvent } from './use-effect-event'

describe('useEffectEvent compatibility', () => {
  it('keeps a stable identity while reading the latest callback', () => {
    const calls: string[] = []
    const { rerender } = renderHook(
      ({ value, prefix }: { value: string; prefix: string }) => {
        const onValue = useEffectEvent((next: string) => {
          calls.push(`${prefix}:${next}`)
        })

        React.useEffect(() => {
          onValue(value)
        }, [value])

        return onValue
      },
      { initialProps: { value: 'light', prefix: 'initial' } }
    )

    rerender({ value: 'dark', prefix: 'latest' })

    expect(calls).toStrictEqual(['initial:light', 'latest:dark'])
  })
})
