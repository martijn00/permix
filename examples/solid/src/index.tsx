import { render } from 'solid-js/web'

/* @refresh reload */
import App from './App.tsx'
import { PermixProvider } from './lib/permix'

import './index.css'

const root = document.querySelector('#root')

render(
  () => (
    <PermixProvider>
      <App />
    </PermixProvider>
  ),
  root!
)
