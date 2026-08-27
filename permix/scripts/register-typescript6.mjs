import { createRequire, registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'typescript/lib/tsc') {
      // vue-tsc patches the TS 5.9 tsc shim; TS 6/7 lib/tsc is not patchable.
      return {
        shortCircuit: true,
        url: pathToFileURL(require.resolve('typescript59/lib/tsc.js')).href,
      }
    }

    if (specifier === 'typescript' || specifier.startsWith('typescript/')) {
      const mapped = specifier.replace(/^typescript(?=\/|$)/, 'typescript6')
      return {
        shortCircuit: true,
        url: pathToFileURL(require.resolve(mapped)).href,
      }
    }

    return nextResolve(specifier, context)
  },
})
