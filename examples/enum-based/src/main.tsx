import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { PermixProvider } from './lib/permix'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <PermixProvider>
      <App />
    </PermixProvider>
  </StrictMode>
)
