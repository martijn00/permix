/**
 * Request-scoped stand-in for React's `cache()` in vitest.
 *
 * Real `cache()` memoizes within a Next.js request (AsyncLocalStorage). In
 * vitest there is no request scope, so the default implementation does not
 * share work across callers. This helper memoizes like one request, and
 * {@link resetRequestCache} starts a new generation so tests can simulate
 * the next request without pretending the cache is process-global forever.
 */
let generation = 0

export function resetRequestCache(): void {
  generation++
}

export function createRequestScopedCache<T extends (...args: any[]) => any>(
  fn: T
): T {
  const stores = new Map<number, Map<string, ReturnType<T>>>()

  return ((...args: Parameters<T>) => {
    let store = stores.get(generation)
    if (!store) {
      store = new Map()
      stores.set(generation, store)
    }

    const key = JSON.stringify(args)
    if (!store.has(key)) {
      store.set(key, fn(...args) as ReturnType<T>)
    }
    return store.get(key)!
  }) as T
}
