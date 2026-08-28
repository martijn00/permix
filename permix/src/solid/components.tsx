import type { Context as SolidContext, JSX } from 'solid-js'
import { createMemo } from 'solid-js'

import type {
  CheckArgs,
  DataAtPath,
  Definition,
  Permix,
  RulesPaths,
} from '../core'
import type { PermixContext } from './hooks'
import { usePermix } from './hooks'

export interface CheckProps<D extends Definition, P extends RulesPaths<D>> {
  path: P
  data?: DataAtPath<D, P>[0]
  children: JSX.Element
  otherwise?: JSX.Element
  reverse?: boolean
}

export interface PermixComponents<D extends Definition> {
  Check: <P extends RulesPaths<D>>(props: CheckProps<D, P>) => JSX.Element
}

export function createComponents<D extends Definition>(
  permix: Pick<Permix<D>, 'getRules' | 'check'>,
  context?: SolidContext<PermixContext<D> | null>
): PermixComponents<D> {
  function Check<P extends RulesPaths<D>>(
    props: CheckProps<D, P>
  ): JSX.Element {
    const bound = usePermix(permix, context)
    const hasPermission = createMemo(() =>
      bound.check(...([props.path, props.data] as unknown as CheckArgs<D>))
    )

    return (
      <>
        {props.reverse
          ? hasPermission()
            ? props.otherwise || null
            : props.children
          : hasPermission()
            ? props.children
            : props.otherwise || null}
      </>
    )
  }

  return {
    Check,
  }
}
