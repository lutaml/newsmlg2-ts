// newsmlg2-ts — NewsML-G2 (IPTC 2.35) codec and the Ribose news
// repository toolkit: document parse/build/edit plus repository
// emission, validation, and discovery (the `newsmlg2` CLI).
import { parseNewsItem, parseNewsMessage } from './parse.js'
import {
  buildNewsItem,
  buildNewsMessage,
  editNewsItem,
  editNewsMessage,
  withdrawNewsItem,
} from './build.js'
import { emitNewsml } from './repository/emit.js'
import { loadMarkdownPosts } from './repository/posts.js'
import { validateOutput } from './repository/validate.js'
import type {
  NewsItemModel,
  NewsMessageModel,
  Rendition,
  ItemMeta,
  ContentMeta,
} from './models.js'
import type { Post, Spoke } from './repository/posts.js'
import catalogs from './catalogs/iptc-g2.json' with { type: 'json' }

export type { NewsItemModel, NewsMessageModel, Rendition, ItemMeta, ContentMeta }
export type { Post, Spoke }
export { parseNewsItem, parseNewsMessage }
export {
  buildNewsItem,
  buildNewsMessage,
  editNewsItem,
  editNewsMessage,
  withdrawNewsItem,
}
export { emitNewsml, loadMarkdownPosts, validateOutput }

/** qcode -> URI via the vendored IPTC catalog, e.g. ninat:text */
export const qcodeToUri = (qcode: string): string => {
  const [alias, code] = qcode.split(':')
  const base = (catalogs.aliases as Record<string, string>)[alias]
  if (!base) throw new Error(`unknown qcode scheme: ${alias}`)
  return `${base}${code}`
}
