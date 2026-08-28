<script lang="ts" generics="D extends Definition, P extends RulesPaths<D>">
import type { Snippet } from 'svelte'
import type { CheckArgs, DataAtPath, Definition, RulesPaths } from '../core'
import { runCheck } from '../core'
import { PERMIX_CONTEXT_KEY, usePermixContext } from './context.svelte'

const {
  path,
  data,
  reverse = false,
  children,
  otherwise,
  contextKey = PERMIX_CONTEXT_KEY,
}: {
  path: P
  data?: DataAtPath<D, P>[0]
  reverse?: boolean
  children: Snippet
  otherwise?: Snippet
  contextKey?: symbol
} = $props()

const context = usePermixContext<D>(contextKey)

const hasPermission = $derived.by(() =>
  runCheck(
    context.permix,
    context.rules,
    ...([path, data] as unknown as CheckArgs<D>),
  ),
)
</script>

{#if reverse ? !hasPermission : hasPermission}
  {@render children()}
{:else if otherwise}
  {@render otherwise()}
{/if}
