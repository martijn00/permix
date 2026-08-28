import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

function getSidebarViewport() {
  return document.querySelector(
    [
      '#nd-sidebar [data-slot="scroll-area-viewport"]',
      '#nd-sidebar [data-base-ui-scroll-area-viewport]',
      '#nd-sidebar',
    ].join(', ')
  )
}

function scrollActiveSidebarItem() {
  const viewport = getSidebarViewport()
  const active = document.querySelector('#nd-sidebar [data-active="true"]')

  if (!viewport || !active) {
    return
  }

  const viewportRect = viewport.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()

  if (
    activeRect.top < viewportRect.top ||
    activeRect.bottom > viewportRect.bottom
  ) {
    active.scrollIntoView({ block: 'nearest' })
  }
}

export function SidebarScrollFix() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    scrollActiveSidebarItem()

    const frame = requestAnimationFrame(scrollActiveSidebarItem)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [pathname])

  return null
}
