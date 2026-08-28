import type { Action, ActionName, Definition } from './definitions'
import type { RulesPaths } from './permix'

type ActionByName<
  Actions extends readonly Action[],
  Name extends string,
> = Actions[number] extends infer Candidate extends Action
  ? Candidate extends unknown
    ? ActionName<Candidate> extends Name
      ? Candidate
      : never
    : never
  : never

type ApplyActionOverlay<
  Base extends readonly Action[],
  Overlay extends readonly Action[],
> = {
  readonly [Index in keyof Base]: Base[Index] extends infer BaseAction extends
    Action
    ? ActionByName<Overlay, ActionName<BaseAction>> extends infer OverlayAction
      ? [OverlayAction] extends [never]
        ? BaseAction
        : OverlayAction
      : never
    : never
}

export type ApplyPermissionOverlay<
  Base extends Definition,
  Overlay extends Definition,
> = Base extends readonly Action[]
  ? Overlay extends readonly Action[]
    ? ApplyActionOverlay<Base, Overlay>
    : Base
  : Base extends { readonly [key: string]: Definition }
    ? {
        readonly [Key in keyof Base]: Key extends keyof Overlay
          ? Overlay[Key] extends Definition
            ? ApplyPermissionOverlay<Base[Key], Overlay[Key]>
            : Base[Key]
          : Base[Key]
      }
    : never

export type UnknownPermissionOverlayPaths<
  Base extends Definition,
  Overlay extends Definition,
> = Exclude<RulesPaths<Overlay>, RulesPaths<Base>>

export type ValidatePermissionOverlay<
  Base extends Definition,
  Overlay extends Definition,
> = [UnknownPermissionOverlayPaths<Base, Overlay>] extends [never]
  ? unknown
  : {
      readonly __unknownPermissionPaths__: UnknownPermissionOverlayPaths<
        Base,
        Overlay
      >
    }

/**
 * Creates an identity helper that limits a typed payload overlay to extracted
 * permission paths.
 */
export function createPermissionOverlay<Base extends Definition>() {
  return <const Overlay extends Definition>(
    overlay: Overlay & ValidatePermissionOverlay<Base, Overlay>
  ): Overlay => overlay
}
