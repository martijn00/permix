import { PermixProvider } from 'permix/solid'
import { render } from 'solid-js/web'

/* @refresh reload */
import App from './App.tsx'
import { permix } from './lib/permix'

import './index.css'

const root = document.getElementById('root')

render(
  () => (
    <PermixProvider permix={permix}>
      <App />
    </PermixProvider>
  ),
  root!
)
