import * as React from 'react'

export const useLayoutEffect =
  'window' in globalThis ? React.useLayoutEffect : React.useEffect
