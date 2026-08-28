import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { NotFound } from '@/components/not-found'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    scrollToTopSelectors: [
      '#nd-sidebar [data-slot="scroll-area-viewport"]',
      '#nd-sidebar [data-base-ui-scroll-area-viewport]',
    ],
    defaultNotFoundComponent: NotFound,
  })
}
