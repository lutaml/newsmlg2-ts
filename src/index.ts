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

// ---- Edit: parse -> mutate -> build, the round-trip surface. Mutation
// is in place on the model (or on the freshly parsed one when given XML);
// the returned builder serializes the edited model.

export type ItemSource = NewsItemModel | string
export type MessageSource = NewsMessageModel | string

export const editNewsItem = (
  source: ItemSource,
  mutate: (item: NewsItemModel) => void,
): { model: NewsItemModel; toXml: () => string } => {
  const model = typeof source === 'string' ? parseNewsItem(source) : source
  mutate(model)
  return buildNewsItem(model)
}

export const editNewsMessage = (
  source: MessageSource,
  mutate: (message: NewsMessageModel) => void,
): { model: NewsMessageModel; toXml: () => string } => {
  const model = typeof source === 'string' ? parseNewsMessage(source) : source
  mutate(model)
  return buildNewsMessage(model)
}

/** Withdraw an item: pubStatus="withdrawn" at a NEW version (a
 * withdrawal is a new version of the item, never a silent edit —
 * consumers notice the change by the version bump). */
export const withdrawNewsItem = (source: ItemSource): { model: NewsItemModel; toXml: () => string } =>
  editNewsItem(source, (item) => {
    item.itemMeta.pubStatus = 'withdrawn'
    item.itemMeta.version = (item.itemMeta.version ?? 1) + 1
  })

/** qcode -> URI via the vendored IPTC catalog, e.g. ninat:text */
export const qcodeToUri = (qcode: string): string => {
  const [alias, code] = qcode.split(':')
  const base = (catalogs.aliases as Record<string, string>)[alias]
  if (!base) throw new Error(`unknown qcode scheme: ${alias}`)
  return `${base}${code}`
}
