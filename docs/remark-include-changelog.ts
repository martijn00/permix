import { readFileSync } from 'node:fs'
import path from 'node:path'

import { fromMarkdown } from 'mdast-util-from-markdown'

interface MdastNode {
  type: string
  depth?: number
  value?: string
  children?: MdastNode[]
}

const changelogPath = path.resolve(import.meta.dirname, '..', 'CHANGELOG.md')

function headingText(node: MdastNode): string {
  return (node.children ?? [])
    .map((child) => child.value ?? '')
    .join('')
    .trim()
}

export function remarkIncludeChangelog() {
  return (tree: { children: MdastNode[] }, file: { path?: string }) => {
    const filePath = file.path ?? ''
    if (!filePath.endsWith('changelog.mdx')) {
      return
    }

    const parsed = fromMarkdown(readFileSync(changelogPath, 'utf-8')) as {
      children: MdastNode[]
    }
    const first = parsed.children[0]
    if (
      first &&
      first.type === 'heading' &&
      first.depth === 1 &&
      headingText(first).toLowerCase() === 'changelog'
    ) {
      parsed.children.shift()
    }

    tree.children.push(...parsed.children)
  }
}
