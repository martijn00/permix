<script lang="ts" generics="D extends Definition, P extends RulesPaths<D>">
import type { Snippet } from 'svelte'
import type { CheckArgs, DataAtPath, Definition, RulesPaths } from '../core'
import { runCheck } from '../core'
import { usePermixContext } from './context.svelte'

const {
  path,
  data,
  reverse = false,
  children,
  otherwise,
}: {
  path: P
  data?: DataAtPath<D, P>[0]
  reverse?: boolean
  children: Snippet
  otherwise?: Snippet
} = $props()

const context = usePermixContext<D>()

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
