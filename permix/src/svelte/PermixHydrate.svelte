<script lang="ts">
import type { Snippet } from 'svelte'
import type { DehydratedState } from '../core'
import { untrack } from 'svelte'
import { PERMIX_CONTEXT_KEY, usePermixContext } from './context.svelte'

const {
  state,
  children,
  contextKey = PERMIX_CONTEXT_KEY,
}: { state: DehydratedState<any>, children: Snippet, contextKey?: symbol } = $props()

const context = usePermixContext(contextKey)

function overlay(next: DehydratedState<any>) {
  if (!context.isReady) {
    context.rules = next as never
  }
}

$effect.pre(() => {
  const next = state
  untrack(() => {
    context.permix.hydrate(next)
    overlay(next)
  })
})
</script>

{@render children()}
