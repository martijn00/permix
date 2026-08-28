import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { PermixProvider } from './lib/permix.ts'

import './index.css'

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <PermixProvider>
      <App />
    </PermixProvider>
  </StrictMode>
)
