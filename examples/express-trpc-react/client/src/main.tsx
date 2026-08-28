import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { PermixProvider } from './permix'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <PermixProvider>
      <App />
    </PermixProvider>
  </StrictMode>
)
