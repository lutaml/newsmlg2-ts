// Typed model subset for the Ribose network's NewsML-G2 usage.
export interface Rendition {
  href: string
  mimetype?: string
  /** e.g. "body-adoc" — identifies which rendition this is */
  rendition?: string
}

export interface ItemMeta {
  guid: string
  lang?: string
  version?: number
  pubStatus?: string
  itemClass?: string            // qcode, e.g. ninat:text
  provider?: { qcode?: string; name?: string }
  versionCreated?: string
  embargo?: string
}

export interface ContentMeta {
  headline?: string
  slugline?: string
  description?: string
  by?: string
  located?: string
  contentCreated?: string
  subjects?: { qcode?: string; name?: string }[]
  /** Inline XHTML body (rendered) — serialized as-is inside inlineXML */
  bodyXhtml?: string
  renditions?: Rendition[]
}

export interface NewsItemModel {
  itemMeta: ItemMeta
  contentMeta?: ContentMeta
}

export interface NewsMessageModel {
  header: { sent?: string; sender?: string }
  items: NewsItemModel[]
}
