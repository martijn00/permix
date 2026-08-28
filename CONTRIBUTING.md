# Contributing

Thanks for helping improve Permix.

## Prerequisites

- Node `>=22` and pnpm `>=11` (`packageManager` in root `package.json`)
- Run `pnpm install` from the repository root

## Development workflow

```bash
pnpm format
pnpm lint
pnpm test
pnpm check-types
pnpm verify
```

`pnpm verify` is the closest local equivalent of the main CI quality gate (format, lint, tests, types, and the library build). CI also runs `pnpm test` and `pnpm test:next` as separate jobs. Use `pnpm verify:full` to run `verify` plus the Next Playwright suite locally.

Use focused branches. Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add createSetupHandler for TanStack Start
fix(react): re-run client setup after re-hydration
docs: document Permix checks in beforeLoad
chore: bump oxlint
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Breaking changes use `feat!:` / `fix!:` or a `BREAKING CHANGE:` footer. Husky runs commitlint on `commit-msg`.

## Change expectations

- Add or adjust tests when behavior changes in a meaningful way.
- Keep `permix/skills/` aligned with `docs/content/docs/` and `examples/` when public API, docs examples, or integration patterns change.
- Keep `permix/benchmarks/entries/` and bundle-size budgets aligned with every public export. After building, run `pnpm --filter permix size:compare`.
- Treat bundle-size baseline and budget updates as reviewed product changes: inspect the generated bundle and explain intentional growth instead of raising limits only to pass CI.
- Do not bump `permix` version or edit released changelog sections by hand. Release Please opens a release PR from conventional commits.

## Documentation

API documentation belongs in `docs/content/docs`. The [changelog page](https://permix.letstri.dev/docs/changelog) reads repo-root `CHANGELOG.md`; do not duplicate release notes in MDX.

```bash
cd docs && pnpm dev   # http://localhost:3000
```

## Pull requests

- Fill out the PR template.
- Link related issues.
- Include screenshots or recordings for docs-site UI changes.

## Releases

Releases are driven by Release Please on `main`. Merging the release PR creates a `vMAJOR.MINOR.PATCH` GitHub Release; the provenance-enabled publish workflow then publishes `permix` to npm. After a release, CI may open a skills review PR.

Historical npm versions that predate this process can be tagged locally with:

```bash
node scripts/tag-historical-releases.mjs          # dry run
node scripts/tag-historical-releases.mjs --apply  # create annotated tags
```

Do not bulk-create GitHub Releases for those tags.
