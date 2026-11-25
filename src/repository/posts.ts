// Post discovery: dated markdown (`YYYY-MM-DD-slug.md`) in a content
// directory, newest first, drafts excluded. The filename date is the only
// publication date.
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
}

export interface Post {
  date: string
  slug: string
  title: string
  author?: string | null
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

export const loadMarkdownPosts = ({
  contentDir,
  authorFallback,
}: {
  contentDir: string
  authorFallback?: string
}): Post[] =>
  readdirSync(contentDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-.*\.md$/.test(f))
    .map((f) => {
      const { fm, body } = parseFrontmatter(readFileSync(join(contentDir, f), 'utf8'))
      const stem = f.replace(/\.md$/, '')
      const version = Number(fm.version)
      return {
        date: stem.slice(0, 10),
        slug: stem.slice(11),
        title: (fm.title as string) ?? stem.slice(11),
        author: (fm.author as string) ?? authorFallback ?? null,
        draft: fm.draft === true,
        withdrawn: fm.withdrawn === true,
        version:
          fm.version !== undefined && fm.version !== '' && Number.isFinite(version) ? version : undefined,
        body,
      }
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
