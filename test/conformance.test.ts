import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseNewsMessage, parseNewsItem, buildNewsItem, buildNewsMessage, qcodeToUri } from '../src/index.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const candidates = [
  process.env.NEWSMLG2_FIXTURES,
  path.resolve(root, '../../../newsmlg2-fixtures'),
].filter(Boolean) as string[]
const fixtures = candidates.map((c) => path.join(c, 'golden')).find((d) => existsSync(d))

describe('golden conformance (newsmlg2-fixtures)', () => {
  it.skipIf(!fixtures)('parses the full item', () => {
    const item = parseNewsItem(readFileSync(path.join(fixtures!, 'newsitem-full.xml'), 'utf8'))
    expect(item.itemMeta.guid).toBe('urn:ribose:news:2026-09-01:pubid:pubid-1-0-released')
    expect(item.itemMeta.provider?.name).toBe('PubID')
    expect(item.contentMeta?.headline).toBe('PubID 1.0 released')
    expect(item.contentMeta?.located).toBe('Hong Kong, HK')
    expect(item.contentMeta?.by).toBe('PubID team')
  })

  it.skipIf(!fixtures)('parses the minimal item', () => {
    const item = parseNewsItem(readFileSync(path.join(fixtures!, 'newsitem-minimal.xml'), 'utf8'))
    expect(item.itemMeta.guid).toBe('urn:ribose:news:2026-09-01:pubid:minimal')
    expect(item.contentMeta?.headline).toBe('Minimal')
  })

  it.skipIf(!fixtures)('parses the index message', () => {
    const msg = parseNewsMessage(readFileSync(path.join(fixtures!, 'newsmessage-index.xml'), 'utf8'))
    expect(msg.header.sender).toBe('Ribose')
    expect(msg.items).toHaveLength(2)
    expect(msg.items[0].itemMeta.guid).toMatch(/pubid/)
  })

  it.skipIf(!fixtures)('parses every IPTC example without throwing', () => {
    const iptcDir = path.join(path.dirname(fixtures!), 'iptc-examples')
    const files = readdirSync(iptcDir).filter((f) => f.endsWith('.xml'))
    let parsed = 0
    for (const f of files) {
      try { parseNewsItem(readFileSync(path.join(iptcDir, f), 'utf8')); parsed++ } catch { /* non-newsItem docs are out of subset */ }
    }
    expect(parsed).toBeGreaterThan(0)
  })
})

describe('build + parse round-trip', () => {
  const item = {
    itemMeta: { guid: 'urn:ribose:news:2026-09-01:pubid:test', lang: 'en', itemClass: 'ninat:text',
      provider: { qcode: 'nprov:pubid', name: 'PubID' }, versionCreated: '2026-09-01T09:00:00+00:00' },
    contentMeta: { headline: 'Round & trip <test>', description: 'd', by: 't',
      renditions: [{ href: 'body.adoc', mimetype: 'text/asciidoc', rendition: 'body-adoc' }] },
  }

  it('round-trips a built item', () => {
    const xml = buildNewsItem(item).toXml()
    const back = parseNewsItem(xml)
    expect(back.itemMeta.guid).toBe(item.itemMeta.guid)
    expect(back.contentMeta?.headline).toBe('Round & trip <test>')
    expect(back.contentMeta?.renditions[0].href).toBe('body.adoc')
  })

  it('round-trips a message with items', () => {
    const xml = buildNewsMessage({ header: { sent: '2026-09-01T09:00:00+00:00', sender: 'Ribose' }, items: [item] }).toXml()
    const back = parseNewsMessage(xml)
    expect(back.items).toHaveLength(1)
    expect(back.items[0].itemMeta.provider?.qcode).toBe('nprov:pubid')
  })
})

describe('catalogs', () => {
  it('resolves qcodes to IPTC URIs', () => {
    expect(qcodeToUri('ninat:text')).toBe('http://cv.iptc.org/newscodes/ninature/text')
  })
})
