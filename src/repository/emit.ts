// Repository emission: posts -> the static NewsML-G2 tree
// (index NewsMessage + per-article full NewsItem + source rendition).
// Determinism: the index `sent` timestamp derives from the newest item's
// date, never the wall clock — two runs over identical input MUST be
// byte-identical.
//
// Publisher identity lives on `Spoke` (provider, sender, GUID namespace,
// canonical path). The Ribose network values are defaults, not hardcode:
// `guidPrefix: 'urn:ribose:news:'`, `postsPath: 'blog'`, sender falls back
// to the spoke name.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildNewsItem, buildNewsMessage, withdrawNewsItem } from '../build.js'
import type { NewsItemModel } from '../models.js'
import type { Post, Spoke } from './posts.js'

export interface EmitOptions {
  spoke: Spoke
  /** newest first, drafts excluded */
  posts: Post[]
  outDir: string
  /** body → XHTML for the inline body; the post is passed so the caller
   * can render per format (md via marked, adoc via asciidoctor) */
  renderBody?: (body: string, post: Post) => string
}

const versionStamp = (p: Post): string => `${p.date}T00:00:00+00:00`

const sentFrom = (posts: Post[]): string =>
  `${posts.map((p) => p.date).sort().at(-1) ?? '1970-01-01'}T00:00:00+00:00`

const guidOf = (spoke: Spoke, p: Post): string =>
  `${spoke.guidPrefix ?? 'urn:ribose:news:'}${p.date}:${spoke.id}:${p.slug}`

const canonicalOf = (spoke: Spoke, p: Post): string => {
  const prefix = spoke.postsPath ?? 'blog'
  const segments = [spoke.base.replace(/\/$/, ''), prefix, `${p.date}-${p.slug}`].filter(Boolean)
  return segments.join('/')
}

const toModel = (
  spoke: Spoke,
  renderBody: EmitOptions['renderBody'],
  p: Post,
  full: boolean,
): NewsItemModel => ({
  itemMeta: {
    guid: guidOf(spoke, p),
    lang: 'en',
    version: p.version ?? 1,
    itemClass: 'ninat:text',
    canonical: canonicalOf(spoke, p),
    provider: { qcode: `nprov:${spoke.id}`, name: spoke.name },
    versionCreated: versionStamp(p),
  },
  contentMeta: {
    headline: p.title,
    by: p.author ?? `${spoke.name} Team`,
    contentCreated: versionStamp(p),
    ...(p.description ? { description: p.description } : {}),
    ...(p.subjects?.length ? { subjects: p.subjects } : {}),
    ...(full
      ? {
          bodyXhtml: renderBody ? renderBody(p.body, p) : p.body,
          renditions: [{ href: 'body.md', rendition: 'rnd:main' }],
        }
      : {}),
  },
})

// Withdrawal goes through the codec's edit API — this layer owns the
// contract trigger (frontmatter), the codec owns the semantics.
const finalize = (model: NewsItemModel, p: Post): NewsItemModel =>
  p.withdrawn ? withdrawNewsItem(model).model : model

/**
 * Emit the repository tree:
 *   <outDir>/newsml.xml                          index NewsMessage (metadata only)
 *   <outDir>/articles/<date>-<slug>/newsml.xml   full NewsItem
 *   <outDir>/articles/<date>-<slug>/body.md      source rendition
 *
 * @returns number of items emitted
 */
export const emitNewsml = ({ spoke, posts, outDir, renderBody }: EmitOptions): number => {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    join(outDir, 'newsml.xml'),
    buildNewsMessage({
      header: { sent: sentFrom(posts), sender: spoke.sender ?? spoke.name },
      items: posts.map((p) => finalize(toModel(spoke, renderBody, p, false), p)),
    }).toXml(),
  )
  for (const p of posts) {
    const dir = join(outDir, 'articles', `${p.date}-${p.slug}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'newsml.xml'), buildNewsItem(finalize(toModel(spoke, renderBody, p, true), p)).toXml())
    writeFileSync(join(dir, 'body.md'), p.body)
  }
  return posts.length
}
