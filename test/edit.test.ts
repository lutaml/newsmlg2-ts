import { describe, expect, it } from 'vitest'
import {
  buildNewsItem,
  buildNewsMessage,
  editNewsItem,
  editNewsMessage,
  parseNewsItem,
  parseNewsMessage,
  withdrawNewsItem,
} from '../src/index.js'
import type { NewsItemModel } from '../src/models.js'

const FULL_ITEM: NewsItemModel = {
  itemMeta: {
    guid: 'urn:ribose:news:2026-11-25:spoke:slug',
    lang: 'en',
    version: 3,
    pubStatus: 'usable',
    itemClass: 'ninat:text',
    canonical: 'https://www.example.org/blog/2026-11-25-slug',
    provider: { qcode: 'nprov:spoke', name: 'Spoke' },
    versionCreated: '2026-11-25T00:00:00+00:00',
    embargo: '2026-11-26T00:00:00+00:00',
  },
  contentMeta: {
    headline: 'Original headline',
    slugline: 'slug',
    description: 'A description',
    by: 'A. Author',
    located: 'Tokyo',
    contentCreated: '2026-11-25T00:00:00+00:00',
    subjects: [{ qcode: 'subj:code', name: 'Subject' }],
    bodyXhtml: '<p>Hello <em>world</em></p>',
    renditions: [{ href: 'body.md', mimetype: 'text/markdown', rendition: 'rndc:main' }],
  },
}

describe('read/write round trip', () => {
  it('build → parse → build is byte-identical for a full item', () => {
    const first = buildNewsItem(FULL_ITEM).toXml()
    const second = buildNewsItem(parseNewsItem(first)).toXml()
    expect(second).toBe(first)
  })

  it('round-trips an item without optional fields (version defaults to 1)', () => {
    const minimal: NewsItemModel = { itemMeta: { guid: 'g' } }
    const first = buildNewsItem(minimal).toXml()
    expect(first).toContain('version="1"')
    const second = buildNewsItem(parseNewsItem(first)).toXml()
    expect(second).toBe(first)
  })

  it('unwraps the html envelope so bodyXhtml round-trips exactly', () => {
    const xml = buildNewsItem(FULL_ITEM).toXml()
    expect(parseNewsItem(xml).contentMeta?.bodyXhtml).toBe('<p>Hello <em>world</em></p>')
  })

  it('round-trips a full message including per-item bodies', () => {
    const message = {
      header: { sent: '2026-11-25T00:00:00+00:00', sender: 'Ribose' },
      items: [FULL_ITEM, { itemMeta: { guid: 'urn:x:2', version: 1 } }],
    }
    const first = buildNewsMessage(message).toXml()
    const second = buildNewsMessage(parseNewsMessage(first)).toXml()
    expect(second).toBe(first)
  })
})

describe('edit', () => {
  it('edits from XML: parse, mutate, rebuild', () => {
    const xml = buildNewsItem(FULL_ITEM).toXml()
    const { toXml } = editNewsItem(xml, (item) => {
      item.contentMeta!.headline = 'Corrected headline'
    })
    const reparsed = parseNewsItem(toXml())
    expect(reparsed.contentMeta?.headline).toBe('Corrected headline')
    expect(reparsed.itemMeta.guid).toBe(FULL_ITEM.itemMeta.guid)
    expect(reparsed.itemMeta.version).toBe(3)
  })

  it('edits a model in place', () => {
    const { model } = editNewsItem(FULL_ITEM, (item) => {
      item.contentMeta!.by = 'B. Author'
    })
    expect(model.contentMeta?.by).toBe('B. Author')
  })

  it('withdrawNewsItem sets pubStatus and bumps the version', () => {
    const { model, toXml } = withdrawNewsItem(FULL_ITEM)
    expect(model.itemMeta.pubStatus).toBe('withdrawn')
    expect(model.itemMeta.version).toBe(4) // was 3 — withdrawal is a new version, never a downgrade
    const xml = toXml()
    expect(xml).toContain('pubstatus="withdrawn"')
    expect(parseNewsItem(xml).itemMeta.pubStatus).toBe('withdrawn')
  })

  it('withdrawNewsItem lifts version 1 to 2', () => {
    const { model } = withdrawNewsItem({ itemMeta: { guid: 'g' } })
    expect(model.itemMeta.version).toBe(2)
    expect(model.itemMeta.pubStatus).toBe('withdrawn')
  })

  it('edits messages', () => {
    const xml = buildNewsMessage({
      header: { sent: '2026-11-25T00:00:00+00:00', sender: 'Ribose' },
      items: [FULL_ITEM],
    }).toXml()
    const { toXml } = editNewsMessage(xml, (message) => {
      message.header.sender = 'Ribose Inc'
      for (const item of message.items) item.itemMeta.lang = 'en'
    })
    const reparsed = parseNewsMessage(toXml())
    expect(reparsed.header.sender).toBe('Ribose Inc')
    expect(reparsed.items[0].itemMeta.lang).toBe('en')
  })
})
