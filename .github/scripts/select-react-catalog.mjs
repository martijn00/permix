import { readFileSync, writeFileSync } from 'node:fs'

const react = process.env.REACT
const reactTypes = process.env.REACT_TYPES
const reactDomTypes = process.env.REACT_DOM_TYPES

if (!react || !reactTypes || !reactDomTypes) {
  throw new Error('REACT, REACT_TYPES, and REACT_DOM_TYPES must be set')
}

const yaml = readFileSync('pnpm-workspace.yaml', 'utf-8')
  .replace(/^( {2}react: ).+$/m, `$1${react}`)
  .replace(/^( {2}react-dom: ).+$/m, `$1${react}`)
  .replace(/^( {2}'@types\/react': ).+$/m, `$1${reactTypes}`)
  .replace(/^( {2}'@types\/react-dom': ).+$/m, `$1${reactDomTypes}`)

writeFileSync('pnpm-workspace.yaml', yaml)
