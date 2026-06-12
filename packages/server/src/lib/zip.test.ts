import { describe, it, expect } from 'vitest'
import { createZip, crc32 } from './zip'

describe('crc32', () => {
  it('matches known CRC-32 test vector', () => {
    // CRC-32 of "123456789" is 0xCBF43926
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926)
  })

  it('returns 0 for empty input', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0)
  })
})

describe('createZip', () => {
  it('produces a buffer with the ZIP local-header and EOCD signatures', () => {
    const zip = createZip([{ name: 'a.csv', content: 'x,y\n1,2\n' }])
    expect(zip.readUInt32LE(0)).toBe(0x04034b50)
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50)
  })

  it('records the correct entry count in the end-of-central-directory', () => {
    const zip = createZip([
      { name: 'a.csv', content: 'a' },
      { name: 'b.csv', content: 'b' },
      { name: 'c.csv', content: 'c' },
    ])
    expect(zip.readUInt16LE(zip.length - 22 + 8)).toBe(3)
  })

  it('stores file content verbatim (STORE method, no compression)', () => {
    const content = 'startedAt,type\n2026-06-01T00:00:00Z,BOTTLE\n'
    const zip = createZip([{ name: 'feedings.csv', content }])
    expect(zip.includes(Buffer.from(content))).toBe(true)
    expect(zip.includes(Buffer.from('feedings.csv'))).toBe(true)
  })

  it('embeds the correct CRC for each entry', () => {
    const content = 'hello'
    const zip = createZip([{ name: 'f.txt', content }])
    expect(zip.readUInt32LE(14)).toBe(crc32(Buffer.from(content)))
  })
})
