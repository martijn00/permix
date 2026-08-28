# Changelog

All notable changes to `permix` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries through 4.1.2 were reconstructed from npm publish dates and git history; later versions are maintained by Release Please.

## [4.1.2](https://github.com/letstri/permix/compare/v4.1.1...v4.1.2) (2026-07-02)

### Bug Fixes

- fix: tanstack start docs

### Documentation

- docs: improve for agents
- docs: fix llms link

### Miscellaneous

- refactor: update skills
- chore: add claude launch
- updates
- add tanstack/intent

## [4.1.1](https://github.com/letstri/permix/compare/v4.1.0...v4.1.1) (2026-06-11)

### Miscellaneous

- update skills
- fixes
- updates

## [4.1.0](https://github.com/letstri/permix/compare/v4.0.1...v4.1.0) (2026-06-08)

### Bug Fixes

- fix: change jsx in tsconfig to react-jsx

### Miscellaneous

- fix trpc types
- add tanstack start example
- refactor: change symbol to plain string
- update docs
- add new 'check' hook and add hooks to each integration
- updates

## [4.0.1](https://github.com/letstri/permix/compare/v4.0.0...v4.0.1) (2026-06-03)

### Miscellaneous

- updates
- updates
- updates
- updates
- updates
- add workflows
- update docs
- minor
- updates
- remove better auth
- update comments

## [4.0.0](https://github.com/letstri/permix/compare/v3.8.1...v4.0.0) (2026-06-03)

### Miscellaneous

- update packages
- updates
- updates
- fixes
- fixes
- updates
- add svelte
- rename typeRequired to required
- fix doc
- updates
- add better auth
- remove commitlint
- chore: add drizzle
- v4
- chore: add zed config
- chore: add imports

## [3.8.1](https://github.com/letstri/permix/compare/v3.8.0...v3.8.1) (2026-04-29)

### Bug Fixes

- fix(elysia): relax checkHandler context type to support schema validation

## [3.8.0](https://github.com/letstri/permix/compare/v3.7.0...v3.8.0) (2026-03-23)

### Features

- feat(better-auth): export PermixSession interface

### Miscellaneous

- feat(better-auth)!: redesign API — split permixPlugin, createPermix, permixClient
- refactor: update publish workflow

## [3.7.0](https://github.com/letstri/permix/compare/v3.6.0...v3.7.0) (2026-03-19)

### Features

- feat(better-auth): add server and client plugins for Better Auth integration
- feat(orpc): allow customizing the context key for the permix instance

### Documentation

- docs(better-auth): add integration docs page
- docs: fix permix check function

### Miscellaneous

- refactor: improve better auth types
- chore(better-auth): add build entry, subpath export, and peer dependency
- test(better-auth): add tests for Better Auth plugin
- chore: update packages
- chore: change fumadocs theme
- chore: update packages
- refactor: move all packages to workspace
- chore: remove context7
- chore: add context7

## [3.6.0](https://github.com/letstri/permix/compare/v3.5.2...v3.6.0) (2025-11-06)

### Features

- feat: add "any" keyword for permissions checking

## [3.5.2](https://github.com/letstri/permix/compare/v3.5.1...v3.5.2) (2025-11-04)

### Bug Fixes

- fix: add react-dom ad optional peer
- fix: markdown url 404 by proxying to github raw files

### Documentation

- docs: fix build
- docs: update packages
- docs: update fumadocs
- docs: restore twoslash
- docs: fix llms
- docs(refactor): added new toc style in docs

### Miscellaneous

- chore: update packages

## [3.5.1](https://github.com/letstri/permix/compare/v3.5.0...v3.5.1) (2025-11-02)

### Miscellaneous

- chore: update packages
- chore: update packages
- refactor: convert script from js to ts
- chore: bump node version
- refactor: add template to trpc
- refactor: add more tests
- chore: update packages

## [3.5.0](https://github.com/letstri/permix/compare/v3.4.1...v3.5.0) (2025-08-02)

### Features

- feat: add dehydrate and hydrate to permix instance

### Documentation

- docs: update hydration to new api

## [3.4.1](https://github.com/letstri/permix/compare/v3.4.0...v3.4.1) (2025-07-23)

### Bug Fixes

- fix: add typescript export to avoid missing types

### Documentation

- docs: improve llms
- docs: add llms-full
- docs: fix example
- docs: rename page

### Miscellaneous

- chore: update packages
- refactor: simplify setup
- chore: update lock
- chore: add more test for hydration

## [3.4.0](https://github.com/letstri/permix/compare/v3.3.0...v3.4.0) (2025-07-09)

### Features

- feat: add `template` function to backend integrations

### Documentation

- docs: update intro
- docs: fix solid example

### Miscellaneous

- chore: update packages
- refactor: remove `checkAsync` method from the backend integrations
- chore: update lock
- chore: clean dependencies

## [3.3.0](https://github.com/letstri/permix/compare/v3.2.1...v3.3.0) (2025-06-24)

### Features

- feat: add Solid.js integration

### Documentation

- docs: add Solid.js example
- docs: add Solid.js integration
- docs: add `dataRequired` and fix styles

### Miscellaneous

- chore: update packages
- build: use Babel insted of esbuild
- chore: update packages

## [3.2.1](https://github.com/letstri/permix/compare/v3.2.0...v3.2.1) (2025-06-23)

### Documentation

- docs: improve docs to new api

### Miscellaneous

- refactor: update exported types

## [3.2.0](https://github.com/letstri/permix/compare/v3.1.0...v3.2.0) (2025-06-22)

### Features

- feat: add dataRequired prop and update datType type

### Miscellaneous

- chore: remove useless code, add console error
- refactor: improved javascript error handling

## [3.1.0](https://github.com/letstri/permix/compare/v3.0.0...v3.1.0) (2025-06-22)

### Features

- feat: add Fastify integration

### Documentation

- docs: improve some parts
- docs: add Fastify integration
- docs: update orpc
- docs: add initial section
- docs: update orpc section

### Miscellaneous

- chore: fix lock
- refactor: update examples
- refactor: rename setState method
- build: add Fastify integration
- chore: update lock
- chore: update permix version
- chore: add external package

## [3.0.0](https://github.com/letstri/permix/compare/v2.1.5...v3.0.0) (2025-06-21)

### Features

- feat: add elysia integration and packages updates

### Documentation

- docs: update setup due to refactor
- docs: add elysia
- docs: fix build
- docs: fix build

### Miscellaneous

- refactor: update trpc, orpc, vue integrations
- chore: add funding
- chore: update packages
- chore: add funding
- chore: add more tests

## [2.1.5](https://github.com/letstri/permix/compare/v2.1.4...v2.1.5) (2025-04-09)

### Bug Fixes

- fix: add exports to utils

### Documentation

- docs: add orpc

## [2.1.4](https://github.com/letstri/permix/compare/v2.1.3...v2.1.4) (2025-04-08)

### Bug Fixes

- fix: add orpc export

## [2.1.3](https://github.com/letstri/permix/compare/v2.1.2...v2.1.3) (2025-04-08)

### Bug Fixes

- fix: add orpc to export

## [2.1.2](https://github.com/letstri/permix/compare/v2.1.1...v2.1.2) (2025-04-08)

### Bug Fixes

- fix: orpc context

## [2.1.1](https://github.com/letstri/permix/compare/v2.1.0...v2.1.1) (2025-04-08)

### Bug Fixes

- fix: trpc context

## [2.1.0](https://github.com/letstri/permix/compare/v2.0.0...v2.1.0) (2025-04-08)

### Features

- feat: add orpc integration

### Bug Fixes

- fix: instance docs

### Documentation

- docs: update node and express
- docs: minor changes
- docs: minor
- docs: improve landing
- docs: fix type
- docs: update instance
- docs: add initial

### Miscellaneous

- refactor: trpc plugin to use initTRPC
- chore: update packages

## [2.0.0](https://github.com/letstri/permix/compare/v2.0.0-rc.13...v2.0.0) (2025-03-06)

### Features

- feat: add test for initial state
- feat: add initial state for permix

### Bug Fixes

- fix: test for initial state

### Miscellaneous

- chore: update packages
- refactor: remove server
- refactor: remove server

## [2.0.0-rc.13](https://github.com/letstri/permix/compare/v2.0.0-rc.12...v2.0.0-rc.13) (2025-03-03)

### Bug Fixes

- fix: export types

## [2.0.0-rc.12](https://github.com/letstri/permix/compare/v2.0.0-rc.11...v2.0.0-rc.12) (2025-03-03)

### Bug Fixes

- fix: types

### Documentation

- docs: add get rules

### Miscellaneous

- chore: update versions

## [2.0.0-rc.11](https://github.com/letstri/permix/compare/v2.0.0-rc.10...v2.0.0-rc.11) (2025-03-03)

### Miscellaneous

- refactor: rename method

## [2.0.0-rc.10](https://github.com/letstri/permix/compare/v2.0.0-rc.9...v2.0.0-rc.10) (2025-03-03)

### Documentation

- docs: fix templates

### Miscellaneous

- refactor: improve state

## [2.0.0-rc.9](https://github.com/letstri/permix/compare/v2.0.0-rc.8...v2.0.0-rc.9) (2025-03-03)

### Documentation

- docs: minor
- docs: update description
- docs: add link

### Miscellaneous

- refactor: templates
- refactor: internals
- chore: update packages

## [2.0.0-rc.8](https://github.com/letstri/permix/compare/v2.0.0-rc.7...v2.0.0-rc.8) (2025-02-28)

### Documentation

- docs: update

### Miscellaneous

- refactor: backend internals

## [2.0.0-rc.7](https://github.com/letstri/permix/compare/v2.0.0-rc.6...v2.0.0-rc.7) (2025-02-28)

### Miscellaneous

- refactor: backend adapters
- chore: improve tests, remove coverage
- refactor: improve server handlers
- refactor: improve server handlers
- Revert "refactor: internal server"
- Revert "refactor: minor"
- Revert "refactor: minor"
- refactor: minor
- refactor: minor
- refactor: internal server

## [2.0.0-rc.6](https://github.com/letstri/permix/compare/v2.0.0-rc.5...v2.0.0-rc.6) (2025-02-27)

### Bug Fixes

- fix: docs

### Documentation

- docs: update version

### Miscellaneous

- refactor: rename functions

## [2.0.0-rc.5](https://github.com/letstri/permix/compare/v2.0.0-rc.4...v2.0.0-rc.5) (2025-02-27)

### Documentation

- docs: update version

### Miscellaneous

- refactor: remove res

## [2.0.0-rc.4](https://github.com/letstri/permix/compare/v2.0.0-rc.3...v2.0.0-rc.4) (2025-02-27)

### Features

- feat: add node and server

### Documentation

- docs: minor
- docs: update package

### Miscellaneous

- refactor: backend integrations

## [2.0.0-rc.3](https://github.com/letstri/permix/compare/v2.0.0-rc.2...v2.0.0-rc.3) (2025-02-27)

### Documentation

- docs: update version

### Miscellaneous

- refactor: templates
- refactor: docs

## [2.0.0-rc.2](https://github.com/letstri/permix/compare/v2.0.0-rc.1...v2.0.0-rc.2) (2025-02-27)

### Miscellaneous

- refactor: packages
- refactor: templates

## [2.0.0-rc.1](https://github.com/letstri/permix/compare/v2.0.0-beta.1...v2.0.0-rc.1) (2025-02-26)

### Bug Fixes

- fix: workflow
- fix: workflow
- fix: workflow

### Documentation

- docs: update package

### Miscellaneous

- refactor: templates
- chore: update package
- chore: update packages

## [2.0.0-beta.1](https://github.com/letstri/permix/compare/v1.0.4...v2.0.0-beta.1) (2025-02-26)

### Bug Fixes

- fix: trpc middleware types
- fix: express example

### Documentation

- docs: update express, hono, trpc based on new features

### Miscellaneous

- refactor: hono middleware
- chore: fix lock
- refactor: internal instances
- refactor: remove next and nuxt
- refactor: remove nuxt
- refactor: remove next and nuxt
- refactor: trpc middleware
- refactor: rename express methods
- refactor: express minor
- refactor: rename express instance
- refactor: finish express middlewares
- refactor: minor updates
- refactor: minor updates
- refactor: update template, refactor express middleware
- refactor: update types
- refactor: update types
- chore: improve examples

## [1.0.4](https://github.com/letstri/permix/compare/v1.0.3...v1.0.4) (2025-02-04)

### Bug Fixes

- fix: vue prop type

### Documentation

- docs: fix nuxt
- docs: fix nuxt

## [1.0.3](https://github.com/letstri/permix/compare/v1.0.2...v1.0.3) (2025-02-03)

### Documentation

- docs: add known issues

### Miscellaneous

- refactor: internal interfaces
- chore: update coverage
- chore: add build

## [1.0.2](https://github.com/letstri/permix/compare/v1.0.1...v1.0.2) (2025-02-02)

### Bug Fixes

- fix: remove useless prop

## [1.0.1](https://github.com/letstri/permix/compare/v1.0.0...v1.0.1) (2025-02-02)

### Features

- feat: add new interface to use as components definition

### Bug Fixes

- fix: lock

### Documentation

- docs: fix vue
- docs: update instance
- docs: update instance
- docs: fix names
- docs: update introduction
- docs: update introduction
- docs: update introduction
- docs: update introduction
- docs: improve introduction
- docs: change permix version
- docs: change permix to workspace
- docs: fix link
- docs: fix typo

### Miscellaneous

- chore: ignore test for nuxt
- refactor: rename commitlint config
- refactor: update spaces

## [1.0.0](https://github.com/letstri/permix/compare/v1.0.0-rc.2...v1.0.0) (2025-01-22)

### Features

- feat: add to react and vue check component `otherwise`

### Bug Fixes

- fix: react context updates
- fix: trpc middleware types
- fix: sandbox
- fix: sandbox
- fix: react component generic

### Documentation

- docs: update examples
- docs: minor improvements
- docs: remove useless
- docs: improvements
- docs: minor improvements
- docs: add compare, feature flags, some imrovements
- docs: update integrations

### Miscellaneous

- chore: update lock
- refactor: remove infers
- refactor: use method to check isready
- chore: improve vue tests
- refactor: improve build
- chore: add more examples
- refactor: remove useless type
- refactor: tests
- chore: update examples
- chore: add more examples
- chore: minor improvements
- refactor: internal serialization
- chore: update example
- refactor: slots
- chore: update examples
- refactor: vue component

## [1.0.0-rc.2](https://github.com/letstri/permix/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2025-01-22)

### Features

- feat: add vue check component
- feat: add react component

### Miscellaneous

- chore: update coverage
- chore: add more examples
- chore: update packages

## [1.0.0-rc.1](https://github.com/letstri/permix/compare/v0.8.0...v1.0.0-rc.1) (2025-01-22)

### Features

- feat: add isReadyAsync
- feat: add nuxt

### Documentation

- docs: improvements
- docs: add nuxt integration
- docs: improvements
- docs: add files to react

## [0.8.0](https://github.com/letstri/permix/compare/v0.7.3...v0.8.0) (2025-01-21)

### Features

- feat: improve hydration

### Bug Fixes

- fix: lock

### Documentation

- docs: add nextjs
- docs: add hydration
- docs: update enums
- docs: improve docs
- docs: add analytics
- docs: add analytics
- docs: add examples
- docs: update version
- docs: update version
- docs: add integrations

### Miscellaneous

- refactor: internals
- refactor: vue composable
- refactor: coverage
- refactor: remove async from setup, add custom hooks, update tests
- refactor: internals
- refactor: internals
- chore: update next example
- refactor: update internals
- chore: update lock
- refactor: react internal
- chore: updates
- chore: add next example
- refactor: internal checks
- refactor: add links

## [0.7.3](https://github.com/letstri/permix/compare/v0.7.2...v0.7.3) (2025-01-18)

### Documentation

- docs: finish main section

### Miscellaneous

- refactor: add links, update hooks

## [0.7.2](https://github.com/letstri/permix/compare/v0.7.2-beta.2...v0.7.2) (2025-01-18)

### Bug Fixes

- fix: publish command
- fix: publish command
- fix: publish command

## [0.7.2-beta.2](https://github.com/letstri/permix/compare/v0.7.2-beta.1...v0.7.2-beta.2) (2025-01-18)

- Published to npm.

## [0.7.2-beta.1](https://github.com/letstri/permix/compare/v0.7.1...v0.7.2-beta.1) (2025-01-18)

### Bug Fixes

- fix: publish command

### Miscellaneous

- refactor: remove readme

## [0.7.1](https://github.com/letstri/permix/compare/v0.7.0...v0.7.1) (2025-01-18)

### Features

- feat: add auto-publish

### Bug Fixes

- fix: publish command
- fix: publish command
- fix: publish command
- fix: publish command

### Documentation

- docs: remove useless file
- docs: add quick start

### Miscellaneous

- refactor: add scripts and coverage
- chore: change docs link
- chore: change docs link

## [0.7.0](https://github.com/letstri/permix/compare/v0.6.0...v0.7.0) (2025-01-17)

### Features

- feat: add async check

### Bug Fixes

- fix: temp remove setup from options

### Miscellaneous

- refactor: rename type

## [0.6.0](https://github.com/letstri/permix/compare/v0.5.0...v0.6.0) (2025-01-17)

### Features

- feat: improve error handling

### Miscellaneous

- chore: add link to docs

## [0.5.0](https://github.com/letstri/permix/compare/v0.4.2...v0.5.0) (2025-01-17)

### Features

- feat: add to react and vue `isReady`

### Miscellaneous

- chore: add examples

## [0.4.2](https://github.com/letstri/permix/compare/v0.4.1...v0.4.2) (2025-01-17)

### Bug Fixes

- fix: trpc types context

### Miscellaneous

- chore: update package

## [0.4.1](https://github.com/letstri/permix/compare/v0.4.0...v0.4.1) (2025-01-17)

### Documentation

- docs: add introduction

### Miscellaneous

- refactor: remove initialPermissions

## [0.4.0](https://github.com/letstri/permix/compare/v0.3.5...v0.4.0) (2025-01-16)

### Features

- feat: add param to template

### Bug Fixes

- fix: script

### Miscellaneous

- chore: update lock
- chore: update packages

## [0.3.5](https://github.com/letstri/permix/compare/v0.3.4...v0.3.5) (2025-01-16)

### Bug Fixes

- fix: backend types

## [0.3.4](https://github.com/letstri/permix/compare/v0.3.3...v0.3.4) (2025-01-16)

### Features

- feat: add permissions definition

## [0.3.3](https://github.com/letstri/permix/compare/v0.3.2...v0.3.3) (2025-01-16)

### Bug Fixes

- fix: react and vue `check` methods

### Miscellaneous

- refactor: improve internal methods

## [0.3.2](https://github.com/letstri/permix/compare/v0.3.1...v0.3.2) (2025-01-16)

### Bug Fixes

- fix: reexport in react and vue

### Miscellaneous

- chore: update descriptions
- refactor: remove useless directive

## [0.3.1](https://github.com/letstri/permix/compare/v0.3.0...v0.3.1) (2025-01-15)

### Bug Fixes

- fix: datatype

## [0.3.0](https://github.com/letstri/permix/compare/v0.2.1...v0.3.0) (2025-01-15)

### Miscellaneous

- refactor: make all permissions required, fix vue and react adapters
- refactor: temp remove examples

## [0.2.1](https://github.com/letstri/permix/compare/v0.2.0...v0.2.1) (2025-01-15)

### Bug Fixes

- fix: type in frontend
- fix: readme

### Documentation

- docs: update frontend
- docs: update backend
- docs: update backend
- docs: update backend

### Miscellaneous

- chore: remove useless command

## [0.2.0](https://github.com/letstri/permix/compare/v0.1.2...v0.2.0) (2025-01-15)

### Features

- feat: add `all` permission

### Documentation

- docs: remove static
- docs: temp comment links
- docs: update landing

### Miscellaneous

- refactor: improve prepublish command

## [0.1.2](https://github.com/letstri/permix/compare/v0.1.1...v0.1.2) (2025-01-15)

### Bug Fixes

- fix: text examples

### Miscellaneous

- chore: add some text
- refactor: add private

## [0.1.1](https://github.com/letstri/permix/compare/v0.1.0...v0.1.1) (2025-01-15)

### Miscellaneous

- refactor: update descriptions
- refactor: remove turbo

## [0.1.0](https://github.com/letstri/permix/compare/v0.0.1...v0.1.0) (2025-01-15)

### Features

- feat: add nuxt adapter
- feat: add next and nuxt examples
- feat: add hono middleware
- feat: add express middleware

### Bug Fixes

- fix: build
- fix: react and vue reactivity

### Documentation

- docs: init

### Miscellaneous

- refactor: update tests
- chore: remove useless variable
- chore: improve tests
- refactor: add jsdoc

## [0.0.1](https://github.com/letstri/permix/compare/v0.0.1-alpha.1...v0.0.1) (2025-01-14)

### Miscellaneous

- refactor: add workspaces, commitlint, turbo, some permix stuff
- update readme
- Create README.md
- init first version
- Initial commit

## [0.0.1-alpha.1](https://github.com/letstri/permix/releases/tag/v0.0.1-alpha.1) (2025-01-13)

- Published to npm.
