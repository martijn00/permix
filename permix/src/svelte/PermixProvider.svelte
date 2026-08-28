<script lang="ts" generics="D extends Definition">
import type { Snippet } from 'svelte'
import type { Definition, Permix } from '../core'
import { PERMIX_CONTEXT_KEY, providePermix } from './context.svelte'

const {
  permix,
  children,
  contextKey = PERMIX_CONTEXT_KEY,
}: { permix: Permix<D>, children: Snippet, contextKey?: symbol } = $props()

// svelte-ignore state_referenced_locally
providePermix(permix, contextKey)
</script>

{@render children()}
