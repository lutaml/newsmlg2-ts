// newsmlg2-ts — NewsML-G2 (IPTC 2.35) codec subset.
import { serialize } from './codec.js'
import { ITEM_TABLE, MESSAGE_TABLE } from './tables.js'
import { parseNewsItem, parseNewsMessage } from './parse.js'
import type { NewsItemModel, NewsMessageModel, Rendition } from './models.js'
import catalogs from './catalogs/iptc-g2.json' with { type: 'json' }

export type { NewsItemModel, NewsMessageModel, Rendition }
export { parseNewsItem, parseNewsMessage }

export const buildNewsItem = (item: NewsItemModel): { model: NewsItemModel; toXml: () => string } => ({
  model: item,
  toXml: () => serialize(ITEM_TABLE, item),
})

export const buildNewsMessage = (message: NewsMessageModel): { model: NewsMessageModel; toXml: () => string } => ({
  model: message,
  toXml: () => serialize(MESSAGE_TABLE, message),
})

/** qcode -> URI via the vendored IPTC catalog, e.g. ninat:text */
export const qcodeToUri = (qcode: string): string => {
  const [alias, code] = qcode.split(':')
  const base = (catalogs.aliases as Record<string, string>)[alias]
  if (!base) throw new Error(`unknown qcode scheme: ${alias}`)
  return `${base}${code}`
}
