// Parse projection: XML -> typed models for the subset. fast-xml-parser
// handles tokenization; this module owns the shape.
import { XMLParser } from 'fast-xml-parser'
import type { NewsMessageModel, NewsItemModel, Rendition } from './models.js'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: false,
})

const one = <T>(v: T | T[] | undefined): T | undefined => (Array.isArray(v) ? v[0] : v)
const arr = <T>(v: T | T[] | undefined): T[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]
const text = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : (v as any)?.['#text'] !== undefined ? String((v as any)['#text']) : undefined

const mapNewsItem = (ni: any, xml: string): NewsItemModel => {
  const meta = ni.itemMeta ?? {}
  const cm = ni.contentMeta
  const contentSet = ni.contentSet
  const renditions: Rendition[] = arr(contentSet?.remoteContent).map((r: any) => ({
    href: r['@_href'],
    mimetype: r['@_mimetype'],
    rendition: r['@_rendition'],
  }))
  return {
    itemMeta: {
      guid: ni['@_guid'],
      lang: ni['@_xml:lang'],
      version: ni['@_version'] !== undefined ? Number(ni['@_version']) : undefined,
      pubStatus: ni['@_pubstatus'],
      itemClass: meta.itemClass?.['@_qcode'],
      canonical: meta.link?.['@_rel'] === 'irel:canonical' ? meta.link?.['@_href'] : undefined,
      provider: meta.provider
        ? { qcode: meta.provider['@_qcode'], name: text(meta.provider.name) }
        : undefined,
      versionCreated: text(meta.versionCreated),
      embargo: text(meta.embargo),
    },
    contentMeta: cm
      ? {
          headline: text(cm.headline),
          slugline: text(cm.slugline),
          description: text(cm.description),
          by: text(cm.by),
          located: text(one(cm.located)?.name) ?? text(cm.located),
          contentCreated: text(cm.contentCreated),
          subjects: arr(cm.subject).map((s: any) => ({ qcode: s['@_qcode'], name: text(s.name) })),
          bodyXhtml: extractInlineXml(xml),
          renditions,
        }
      : undefined,
  }
}

// Inline XHTML is element content; extract it from the raw XML verbatim
// so markup passes through untouched.
const extractInlineXml = (xml: string): string | undefined => {
  const m = xml.match(/<inlineXML[^>]*>([\s\S]*?)<\/inlineXML>/)
  return m ? m[1].trim() : undefined
}

export const parseNewsItem = (xml: string): NewsItemModel => {
  const doc = parser.parse(xml)
  const ni = one(doc['newsItem']) ?? one((doc['newsMessage'] as any)?.itemSet?.newsItem)
  if (!ni) throw new Error('no newsItem element')
  return mapNewsItem(ni, xml)
}

export const parseNewsMessage = (xml: string): NewsMessageModel => {
  const doc = parser.parse(xml)
  const msg = one(doc['newsMessage'])
  if (!msg) throw new Error('no newsMessage element')
  return {
    header: { sent: text(msg.header?.sent), sender: text(msg.header?.sender) },
    items: arr(msg.itemSet?.newsItem).map((ni: any) => mapNewsItem(ni, xml)),
  }
}
