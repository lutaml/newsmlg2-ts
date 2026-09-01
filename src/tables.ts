// Declarative serialization table: the element tree of the subset, in
// canonical order. `get` may return an object, a primitive, or an array
// (the element template repeats per item). Text and attrs receive the
// RESOLVED value. New elements are new rows, never new serializer code.
export type Attr = Record<string, string | number | undefined>

export interface El {
  name: string
  get?: (o: any) => any
  text?: (v: any) => string | undefined
  attrs?: (v: any) => Attr
  children?: El[]
  /** arrays: 'self' repeats this element per item (default);
   * 'children' renders this element once, repeating its single child. */
  repeat?: 'self' | 'children'
  /** emit text content unescaped (element content, e.g. inlineXML XHTML) */
  raw?: boolean
}

const leaf = (name: string): El => ({
  name, get: (o) => o?.[name], text: (v) => (v === undefined || v === null ? undefined : String(v)),
})

export const ITEM_TABLE: El = {
  name: 'newsItem',
  get: (i) => i,
  attrs: (i) => ({
    'xml:lang': i.itemMeta?.lang,
    standard: 'NewsML-G2',
    standardversion: '2.35',
    conformance: 'power',
    guid: i.itemMeta?.guid,
    version: i.itemMeta?.version ?? 1,
    pubstatus: i.itemMeta?.pubStatus,
  }),
  children: [
    { name: 'itemMeta', get: (i) => i.itemMeta, children: [
      { name: 'itemClass', get: (m) => m.itemClass, attrs: (v) => ({ qcode: v }) },
      { name: 'provider', get: (m) => m.provider, attrs: (p) => ({ qcode: p?.qcode }),
        children: [leaf('name')] },
      leaf('versionCreated'),
      leaf('embargo'),
      { name: 'link', get: (m) => m.canonical ? { rel: 'irel:canonical', href: m.canonical } : undefined,
        attrs: (l) => ({ rel: l.rel, href: l.href }) },
    ]},
    { name: 'contentMeta', get: (i) => i.contentMeta, children: [
      leaf('contentCreated'),
      leaf('headline'),
      leaf('slugline'),
      leaf('description'),
      leaf('by'),
      { name: 'located', get: (c) => (c.located ? { name: c.located } : undefined),
        children: [leaf('name')] },
      { name: 'subject', get: (c) => c.subjects ?? [], attrs: (s) => ({ qcode: s?.qcode }),
        children: [leaf('name')] },
    ]},
    { name: 'contentSet', get: (i) => i.contentMeta, children: [
      { name: 'inlineXML', get: (c) => c.bodyXhtml, raw: true,
        text: (v) => `<html xmlns="http://www.w3.org/1999/xhtml">${String(v)}</html>` },
      { name: 'remoteContent', get: (c) => c.renditions ?? [],
        attrs: (r) => ({ href: r?.href, mimetype: r?.mimetype, rendition: r?.rendition }) },
    ]},
  ],
}

export const MESSAGE_TABLE: El = {
  name: 'newsMessage',
  get: (m) => m,
  children: [
    { name: 'header', get: (m) => m.header, children: [leaf('sent'), leaf('sender')] },
    { name: 'itemSet', get: (m) => m.items, repeat: 'children', children: [ITEM_TABLE] },
  ],
}
