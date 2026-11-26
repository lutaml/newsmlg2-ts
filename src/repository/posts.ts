// Post discovery: dated posts (`YYYY-MM-DD-slug.{md,adoc}`) in a content
// directory, newest first, drafts excluded. The filename date is the only
// publication date. Markdown and AsciiDoc bodies are both first-class —
// Post.format tells the caller which renderer to use.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

export interface Spoke {
  /** stable, kebab-case; equals the wire sites registry spoke id */
  id: string
  /** display name (provider, byline fallback) */
  name: string
  /** deployed origin; https; no trailing slash */
  base: string
  /** publisher identity for the index NewsMessage sender.
   * Default: `name`. */
  sender?: string
  /** GUID URN namespace, including the trailing colon. Permanent
   * identifier — pick it once, never change it.
   * Default: `urn:ribose:news:` (the Ribose network scheme). */
  guidPrefix?: string
  /** posts path prefix used for canonical links. Default: `blog`. */
  postsPath?: string
}

export interface PostSubject {
  name: string
  qcode?: string
}

export interface Post {
  date: string
  slug: string
  title: string
  /** md | adoc — the body format; drives the caller's renderer */
  format: 'md' | 'adoc'
  /** language edition when the corpus is multilingual (e.g. zh-hant) */
  lang?: string
  author?: string | null
  /** excerpt → contentMeta/description */
  description?: string
  /** categories → contentMeta/subjects */
  subjects?: PostSubject[]
  /** explicit item version (corrections) */
  version?: number
  /** emits the item at pubStatus="withdrawn" on a bumped version */
  withdrawn?: boolean
  body: string
}

const parseFrontmatter = (raw: string): { fm: Record<string, unknown>; body: string } => {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const fm: Record<string, unknown> = {}
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
    }
  }
  return { fm: (matter(raw).data as Record<string, unknown>) || fm, body: m ? raw.slice(m[0].length) : raw }
}

const asString = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  return Array.isArray(v) || typeof v === 'object' ? undefined : String(v)
}

/** author frontmatter: a string, or an object with a name (hub corpus). */
const asAuthor = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v === 'object' && !Array.isArray(v)) {
    const name = (v as Record<string, unknown>).name
    return name === undefined || name === null ? undefined : String(name)
  }
  if (Array.isArray(v)) return undefined
  return String(v)
}

const asSubjects = (fm: Record<string, unknown>): PostSubject[] | undefined => {
  const raw = fm.categories ?? fm.subjects
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const names = raw.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
  return names.length ? names.map((name) => ({ name })) : undefined
}

/** AsciiDoc doctitle: the `= Title` line, when the frontmatter has none. */
const asciidocTitle = (body: string): string | undefined => {
  const m = body.match(/^=\s+(.+)$/m)
  return m ? m[1].trim() : undefined
}

export const loadMarkdownPosts = ({
  contentDir,
  authorFallback,
  langFallback,
}: {
  contentDir: string
  authorFallback?: string
  /** default language edition when the frontmatter has none */
  langFallback?: string
}): Post[] =>
  readdirSync(contentDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-.*\.(md|adoc)$/.test(f))
    .map((f) => {
      const format = f.endsWith('.adoc') ? ('adoc' as const) : ('md' as const)
      const raw = readFileSync(join(contentDir, f), 'utf8')
      const { fm, body } = parseFrontmatter(raw)
      const stem = f.replace(/\.(md|adoc)$/, '')
      const version = Number(fm.version)
      return {
        date: stem.slice(0, 10),
        slug: stem.slice(11),
        title: asString(fm.title) ?? (format === 'adoc' ? asciidocTitle(body) : undefined) ?? stem.slice(11),
        format,
        lang: asString(fm.lang) ?? langFallback,
        author: asAuthor(fm.author) ?? authorFallback ?? null,
        description: asString(fm.description) ?? asString(fm.excerpt),
        subjects: asSubjects(fm),
        draft: fm.draft === true,
        withdrawn: fm.withdrawn === true,
        version:
          fm.version !== undefined && fm.version !== '' && Number.isFinite(version) ? version : undefined,
        body,
      }
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
