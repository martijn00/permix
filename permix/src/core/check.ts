import type { Definition } from './definitions'
import { PermixNotReadyError, PermixRuleNotDefinedError } from './errors'
import type {
  CheckerFn,
  DataAtPath,
  RulesPaths,
  SpecialPath,
  SpecialSymbol,
} from './permix'
import type { RuleDecision, RuleResult, Rules } from './rules'

export type CheckArgs<D extends Definition> =
  | {
      [P in RulesPaths<D>]: [path: P, ...data: DataAtPath<D, P>]
    }[RulesPaths<D>]
  | [special: SpecialPath<D>]
  | [callback: (c: CheckerFn<D>) => boolean]

type Rule = Rules<any> | boolean | ((data?: unknown) => RuleResult)

export interface ExplainResult {
  readonly allowed: boolean
  readonly path: string | null
  readonly reasons: readonly string[]
}

interface WalkResult {
  readonly allowed: boolean
  readonly reasons: readonly string[]
}

function isRuleDecision(value: unknown): value is RuleDecision {
  if (typeof value !== 'object' || value === null || !('allow' in value)) {
    return false
  }
  return typeof value.allow === 'boolean'
}

export function unwrapRuleResult(value: unknown): WalkResult {
  if (typeof value === 'boolean') {
    return { allowed: value, reasons: [] }
  }
  if (isRuleDecision(value)) {
    const reason = value.reason
    if (value.allow || reason === undefined || reason.length === 0) {
      return { allowed: value.allow, reasons: [] }
    }
    return { allowed: false, reasons: [reason] }
  }
  return { allowed: Boolean(value), reasons: [] }
}

function isSpecialSymbol(value: unknown): value is SpecialSymbol {
  return value === '~any' || value === '~all'
}

function pathFromArgs(args: unknown[]): string {
  return args.filter((a): a is string => typeof a === 'string').join('.')
}

/**
 * Invoke a rule with no check data, treating a thrown error as `false`.
 *
 * `~any`/`~all` aggregation and `dehydrate()` evaluate every rule without an
 * entity. Entity-required validators (e.g. `post => post.authorId === id`)
 * throw on `undefined`, so we treat that as a denied permission instead of
 * letting the whole operation crash.
 */
export function callRuleWithoutData(rule: () => unknown): boolean {
  try {
    return unwrapRuleResult(rule()).allowed
  } catch {
    return false
  }
}

function ownChild(parent: object, key: string): Rule | undefined {
  if (!Object.hasOwn(parent, key)) {
    return undefined
  }
  return (parent as Record<string, Rule>)[key]
}

function walk(rules: Rules<any>, inputArgs: unknown[]): WalkResult {
  let args = inputArgs
  const first = args[0]

  if (typeof first === 'string') {
    const parts = first.split('.')
    const last = parts.at(-1)

    if (isSpecialSymbol(last)) {
      let subtree: Rule | undefined = rules
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i]
        if (segment === undefined) {
          subtree = undefined
          break
        }
        if (subtree && typeof subtree === 'object') {
          subtree = ownChild(subtree, segment)
        } else {
          subtree = undefined
          break
        }
      }

      if (subtree === undefined) {
        const path = parts.slice(0, -1).join('.')
        throw new PermixRuleNotDefinedError(path)
      }

      const out: WalkResult[] = []
      const visit = (rule: Rule) => {
        if (typeof rule === 'boolean') {
          out.push({ allowed: rule, reasons: [] })
          return
        }
        if (typeof rule === 'function') {
          try {
            out.push(unwrapRuleResult(rule()))
          } catch {
            out.push({ allowed: false, reasons: [] })
          }
          return
        }
        for (const key of Object.keys(rule)) {
          const child = ownChild(rule, key)
          if (child !== undefined) {
            visit(child)
          }
        }
      }
      visit(subtree)
      if (out.length === 0) {
        return { allowed: false, reasons: [] }
      }
      const allowed =
        last === '~all'
          ? out.every((item) => item.allowed)
          : out.some((item) => item.allowed)
      const reasons = allowed
        ? []
        : out.flatMap((item) => (item.allowed ? [] : item.reasons))
      return { allowed, reasons }
    }

    if (first.includes('.')) {
      args = [...parts, ...args.slice(1)]
    }
  }

  let rule: Rule | undefined = rules
  let i = 0
  for (; i < args.length && typeof rule === 'object'; i++) {
    const arg = args[i]
    if (typeof arg !== 'string') {
      break
    }
    rule = ownChild(rule, arg)
  }

  if (typeof rule === 'boolean') {
    const remainingPath = args.slice(i).some((a) => typeof a === 'string')
    if (remainingPath) {
      throw new PermixRuleNotDefinedError(pathFromArgs(args))
    }
    return { allowed: rule, reasons: [] }
  }
  if (typeof rule === 'function') {
    return unwrapRuleResult(rule(args[i]))
  }

  const path = args.slice(0, i + 1).join('.')
  throw new PermixRuleNotDefinedError(path)
}

function evaluate<D extends Definition>(
  rules: Rules<D> | null | (() => Rules<D> | null),
  args: CheckArgs<D>
): WalkResult {
  const r = typeof rules === 'function' ? rules() : rules

  if (!r) {
    throw new PermixNotReadyError()
  }

  if (typeof args[0] === 'function') {
    const reasons: string[] = []
    const allowed = Boolean(
      args[0]((path, ...data) => {
        const result = walk(r, [path, ...data])
        if (!result.allowed) {
          reasons.push(...result.reasons)
        }
        return result.allowed
      })
    )
    return { allowed, reasons: allowed ? [] : reasons }
  }

  return walk(r, args)
}

export function createCheck<D extends Definition>(
  rules: Rules<D> | null | (() => Rules<D> | null)
) {
  return (...args: CheckArgs<D>): boolean => evaluate(rules, args).allowed
}

export function createExplain<D extends Definition>(
  rules: Rules<D> | null | (() => Rules<D> | null)
) {
  return (...args: CheckArgs<D>): ExplainResult => {
    const result = evaluate(rules, args)
    const context = createCheckContext<D>(...args)
    return {
      allowed: result.allowed,
      path: context.path,
      reasons: result.reasons,
    }
  }
}

/**
 * Evaluate a check against overlay rules when the instance has none yet
 * (hydrate first paint), otherwise go through `instance.check` so hooks and
 * Standard Schema `validate` run.
 */
export function runCheck(
  instance: {
    check: (...args: any[]) => boolean
    getRules: () => Rules<any> | null
  },
  overlay: Rules<any> | null | undefined,
  ...args: any[]
): boolean {
  if (instance.getRules() === null && overlay) {
    return (createCheck(overlay as never) as (...next: any[]) => boolean)(
      ...args
    )
  }
  return instance.check(...args)
}

/**
 * Same overlay rule as {@link runCheck}: first-paint dehydrated rules must not
 * throw {@link PermixNotReadyError}. Does not fire the `check` hook.
 */
export function runExplain(
  instance: {
    explain: (...args: any[]) => ExplainResult
    getRules: () => Rules<any> | null
  },
  overlay: Rules<any> | null | undefined,
  ...args: any[]
): ExplainResult {
  if (instance.getRules() === null && overlay) {
    return (
      createExplain(overlay as never) as (...next: any[]) => ExplainResult
    )(...args)
  }
  return instance.explain(...args)
}

export interface CheckContext<D extends Definition> {
  path: RulesPaths<D> | SpecialPath<D> | null
  data?: unknown
  allowed?: boolean
  error?: unknown
  reasons?: readonly string[]
}

export function createCheckContext<D extends Definition>(
  ...params: CheckArgs<D>
): CheckContext<D> {
  const first = params[0]

  if (typeof first === 'function') {
    return { path: null }
  }

  const last = first.split('.').pop()
  if (isSpecialSymbol(last)) {
    return { path: first }
  }

  const data = params[1]
  if (data === undefined) {
    return { path: first }
  }

  return { path: first, data }
}

export function withDenialReasons<D extends Definition>(
  instance: { explain: (...args: CheckArgs<D>) => ExplainResult },
  args: CheckArgs<D>
): CheckContext<D> {
  const explanation = instance.explain(...args)
  return {
    ...createCheckContext(...args),
    allowed: explanation.allowed,
    reasons: explanation.reasons,
  }
}
