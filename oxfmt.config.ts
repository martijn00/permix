import type { OxfmtConfig } from 'oxfmt'
import { defineConfig } from 'oxfmt'

import { ignorePatterns } from './ignores.ts'

export default defineConfig({
  semi: false,
  singleQuote: true,
  jsxSingleQuote: true,
  endOfLine: 'lf',
  arrowParens: 'always',
  bracketSpacing: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false,
  sortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: 'asc',
  },
  sortPackageJson: {
    sortScripts: true,
  },
  ignorePatterns,
} satisfies OxfmtConfig)
