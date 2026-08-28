import { createApp } from 'vue'

import App from './App.vue'
import { PermixProvider } from './lib/permix'

import './style.css'

createApp({
  components: { PermixProvider, App },
  template: '<PermixProvider><App /></PermixProvider>',
}).mount('#app')
