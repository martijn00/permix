import { PermixProvider } from 'permix/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { permix } from './permix'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <PermixProvider permix={permix}>
      <App />
    </PermixProvider>
  </StrictMode>
)
