import { describe, expect, it } from 'vitest'

import { importOxcParser } from './deps'

describe('extractor optional peers', () => {
  it('loads oxc-parser from the workspace install', async () => {
    const parser = await importOxcParser()
    expect(parser.parseSync).toBeTypeOf('function')
    expect(parser.Visitor).toBeTypeOf('function')
  })
})
