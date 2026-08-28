'use client'

import { useState } from 'react'

import { checkCreate } from '../actions'

export function ActionCheck() {
  const [result, setResult] = useState<string>('idle')

  return (
    <div>
      <button
        type="button"
        data-testid="action-check"
        onClick={async () => {
          const allowed = await checkCreate()
          setResult(allowed ? 'allowed' : 'denied')
        }}
      >
        Check via action
      </button>
      <span data-testid="action-result">{result}</span>
    </div>
  )
}
