import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emitNewsml, loadMarkdownPosts, validateOutput } from '../src/index.js'
import type { Post } from '../src/index.js'

const POSTS: Post[] = [
  { date: '2026-10-01', slug: 'hello-world', title: 'Hello', author: 'A. Author', body: '# hi\n\nworld\n' },
  { date: '2026-09-15', slug: 'earlier', title: 'Earlier', body: 'plain text' },
]

const SPEAK = { id: 'test', name: 'Test', base: 'https://test.example' }
const emit = (dir: string, posts: Post[] = POSTS) =>
  emitNewsml({ spoke: SPEAK, posts, outDir: dir, renderBody: (md) => `<p>${md.trim()}</p>` })

const temp = () => mkdtempSync(join(tmpdir(), 'newsmlg2-repo-'))

describe('repository emission', () => {
  it('emits the contract tree', () => {
    const dir = temp()
    try {
      expect(emit(dir)).toBe(2)
      const index = readFileSync(join(dir, 'newsml.xml'), 'utf8')
      expect(index).toMatch(/urn:ribose:news:2026-10-01:test:hello-world/)
      expect(index).toMatch(/urn:ribose:news:2026-09-15:test:earlier/)
      expect(index).not.toMatch(/bodyXhtml|<body>/)
      const art = join(dir, 'articles', '2026-10-01-hello-world')
      expect(existsSync(join(art, 'newsml.xml'))).toBe(true)
      expect(existsSync(join(art, 'body.md'))).toBe(true)
      expect(readFileSync(join(art, 'newsml.xml'), 'utf8'))
        .toMatch(/https:\/\/test\.example\/blog\/2026-10-01-hello-world/)
      expect(readFileSync(join(art, 'body.md'), 'utf8')).toBe(POSTS[0].body)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('is byte-identical across runs (deterministic sent)', () => {
    const a = temp()
    const b = temp()
    try {
      emit(a)
      emit(b)
      for (const f of ['newsml.xml', 'articles/2026-10-01-hello-world/newsml.xml', 'articles/2026-10-01-hello-world/body.md']) {
        expect(readFileSync(join(a, f), 'utf8')).toBe(readFileSync(join(b, f), 'utf8'))
      }
    } finally {
      rmSync(a, { recursive: true, force: true })
      rmSync(b, { recursive: true, force: true })
    }
  })

  it('derives sent from the newest item, not the clock', () => {
    const dir = temp()
    try {
      emit(dir)
      expect(readFileSync(join(dir, 'newsml.xml'), 'utf8'))
        .toMatch(/<sent>2026-10-01T00:00:00\+00:00<\/sent>/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('carries withdrawn and explicit versions', () => {
    const dir = temp()
    try {
      emit(dir, [
        { date: '2026-10-02', slug: 'retracted', title: 'R', body: 'x', withdrawn: true },
        { date: '2026-10-03', slug: 'corrected', title: 'C', body: 'y', version: 5 },
      ])
      const index = readFileSync(join(dir, 'newsml.xml'), 'utf8')
      expect(index).toMatch(/guid="urn:ribose:news:2026-10-02:test:retracted" version="2" pubstatus="withdrawn"/)
      expect(index).toMatch(/guid="urn:ribose:news:2026-10-03:test:corrected" version="5"/)
      const full = readFileSync(join(dir, 'articles', '2026-10-02-retracted', 'newsml.xml'), 'utf8')
      expect(full).toMatch(/pubstatus="withdrawn"/)
      expect(full).toMatch(/version="2"/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('validates a fresh tree and flags a broken one', () => {
    const dir = temp()
    try {
      emit(dir)
      expect(validateOutput(dir)).toEqual([])
      rmSync(join(dir, 'articles', '2026-10-01-hello-world', 'body.md'))
      expect(validateOutput(dir).length).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('discovers dated posts, skips drafts, reads withdrawn/version', () => {
    const dir = temp()
    try {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, '2026-05-01-real.md'), '---\ntitle: Real\n---\nbody\n')
      writeFileSync(join(dir, '2026-05-02-draft.md'), '---\ntitle: D\ndraft: true\n---\nx\n')
      writeFileSync(join(dir, '2026-05-03-pulled.md'), '---\ntitle: P\nwithdrawn: true\nversion: 3\n---\ny\n')
      writeFileSync(join(dir, 'undated.md'), '---\ntitle: N\n---\n')
      const posts = loadMarkdownPosts({ contentDir: dir, authorFallback: 'Team' })
      expect(posts.length).toBe(2)
      expect(posts[0].slug).toBe('pulled')
      expect(posts[0].withdrawn).toBe(true)
      expect(posts[0].version).toBe(3)
      expect(posts[1].slug).toBe('real')
      expect(posts[1].title).toBe('Real')
      expect(posts[1].author).toBe('Team')
      expect(posts[1].body).toBe('body\n')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('publisher identity is configuration', () => {
  it('custom guid namespace, sender, and posts path', () => {
    const dir = temp()
    try {
      emitNewsml({
        spoke: { id: 'acme', name: 'Acme', base: 'https://acme.example', sender: 'Acme Newsdesk', guidPrefix: 'urn:acme:wire:', postsPath: 'press' },
        posts: POSTS,
        outDir: dir,
      })
      const index = readFileSync(join(dir, 'newsml.xml'), 'utf8')
      expect(index).toMatch(/<sender>Acme Newsdesk<\/sender>/)
      expect(index).toMatch(/urn:acme:wire:2026-10-01:acme:hello-world/)
      expect(index).not.toMatch(/urn:ribose:news:/)
      const art = readFileSync(join(dir, 'articles', '2026-10-01-hello-world', 'newsml.xml'), 'utf8')
      expect(art).toMatch(/<link rel="irel:canonical" href="https:\/\/acme\.example\/press\/2026-10-01-hello-world"\/>/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('sender falls back to the spoke name; canonical defaults to /blog/', () => {
    const dir = temp()
    try {
      emit(dir)
      const index = readFileSync(join(dir, 'newsml.xml'), 'utf8')
      expect(index).toMatch(/<sender>Test<\/sender>/)
      expect(index).toMatch(/canonical="https:\/\/test\.example\/blog\/2026-10-01-hello-world"|href="https:\/\/test\.example\/blog\/2026-10-01-hello-world"/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('validates with the configured guid namespace and flags a foreign one', () => {
    const dir = temp()
    try {
      emitNewsml({
        spoke: { id: 'acme', name: 'Acme', base: 'https://acme.example', guidPrefix: 'urn:acme:wire:' },
        posts: POSTS,
        outDir: dir,
      })
      expect(validateOutput(dir, { guidPrefix: 'urn:acme:wire:' })).toEqual([])
      const foreign = validateOutput(dir) // default ribose prefix does not match
      expect(foreign.length).toBeGreaterThan(0)
      expect(foreign[0]).toMatch(/not under "urn:ribose:news:"/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('front-matter description and categories', () => {
  it('maps description and categories into index and full items', () => {
    const dir = temp()
    try {
      emit(dir, [
        {
          date: '2026-10-01', slug: 'rich', title: 'Rich', body: 'text',
          description: 'An excerpt',
          subjects: [{ name: 'Releases' }, { name: 'Benchmarks' }],
        },
      ])
      const index = readFileSync(join(dir, 'newsml.xml'), 'utf8')
      expect(index).toMatch(/<description>An excerpt<\/description>/)
      expect(index).toMatch(/<subject>\s*<name>Releases<\/name>\s*<\/subject>/)
      const full = readFileSync(join(dir, 'articles', '2026-10-01-rich', 'newsml.xml'), 'utf8')
      expect(full).toMatch(/<description>An excerpt<\/description>/)
      expect(full).toMatch(/<subject>\s*<name>Benchmarks<\/name>\s*<\/subject>/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('discovers description (excerpt fallback) and categories from front matter', () => {
    const dir = temp()
    try {
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, '2026-06-01-a.md'), '---\ntitle: A\ndescription: Desc\nexcluded: x\n---\nbody\n')
      writeFileSync(join(dir, '2026-06-02-b.md'), "---\ntitle: B\nexcerpt: 'Shorty'\ncategories: ['One', 'Two']\n---\nbody\n")
      const posts = loadMarkdownPosts({ contentDir: dir })
      expect(posts[0].description).toBe('Shorty')
      expect(posts[0].subjects).toEqual([{ name: 'One' }, { name: 'Two' }])
      expect(posts[1].description).toBe('Desc')
      expect(posts[1].subjects).toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
