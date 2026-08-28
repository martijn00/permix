import type { PermissionDiagnostic } from './types'

export class PermissionExtractionError extends Error {
  readonly diagnostics: readonly PermissionDiagnostic[]

  constructor(diagnostics: readonly PermissionDiagnostic[]) {
    const summary =
      diagnostics.length === 1
        ? diagnostics[0]?.message
        : `Permission extraction failed with ${diagnostics.length} errors.`

    super(summary)
    this.name = 'PermissionExtractionError'
    this.diagnostics = diagnostics
  }
}
