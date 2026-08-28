# instant-nav rig: permix Next.js adapter fixtures

- BUILD: `EXPOSE_TESTING_API=1` plus the versioned `next` binary from this package (`next-15`, `next-16-0`, `next-16-3`) run as `next build && next start` inside `permix/test/next/.scratch/<version>`. Never `next dev`.
- EXPOSE: `EXPOSE_TESTING_API=1` at **build** time, wired to `experimental.exposeTestingApiInProductionBuild` in the 16.3 overlay config. Compat versions (15.5.24, 16.0.11) do not run `instant()`.
- RUN: `pnpm --filter @permix/next-integration test` (or `node permix/test/next/run.mjs` after `pnpm --filter permix build`). Playwright uses `BASE_URL` from the launcher. Desktop 1280×720 and mobile 390×844 projects run the 16.3 instant-navigation file.
- TEST USER: cookie `demo-user=alice` (can create/update) or `demo-user=bob` (read only). No login helper; tests call `context.addCookies`. Public/cache-safe checks do not depend on the cookie.
- DRIFT: cookie value, tenant root param (`acme` vs `globex`), whether a `"use cache: private"` payload was primed, Partial Prefetching vs `prefetch={true}`. The cold session island uses `connection()` so the testing lock can gate it; cookie reads alone are not a lock probe.
- LOOP: local `build → start → playwright` via `run.mjs`; CI job `.github/workflows/next-integration.yml` does the same. Fully agent-drivable; no secrets.
- LIVENESS: n/a — each run builds and starts a local server on a free port, then stops that process group.
- WALLS: `permix` must be built (`pnpm --filter permix build`) so the fixture can import `permix`/`permix/next`. Playwright Chromium is installed with `pnpm exec playwright install chromium`. Next 15/16.0 configs must not set `cacheComponents` or `partialPrefetching`.
