import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('../bin/newsmlg2.mjs', import.meta.url))

// The CLI imports the built dist; build runs before tests in CI.
describe('newsmlg2 CLI', () => {
  it('emits and validates a tree end-to-end', () => {
    const dir = mkdtempSync(join(tmpdir(), 'newsmlg2-cli-'))
    try {
      const contentDir = join(dir, 'content')
      const outDir = join(dir, 'dist', 'news-data')
      mkdirSync(contentDir, { recursive: true })
      writeFileSync(join(contentDir, '2026-11-25-hello.md'), '---\ntitle: Hello\n---\nhello\n')
      const cfg = join(dir, 'spoke.yaml')
      writeFileSync(cfg, `id: smoke\nname: Smoke\nbase: https://smoke.example\ncontentDir: ${contentDir}\noutDir: ${outDir}\n`)

      const emit = execFileSync(process.execPath, [bin, 'emit', '--config', cfg], { encoding: 'utf8' })
      expect(emit).toMatch(/1 item\(s\)/)
      expect(existsSync(join(outDir, 'newsml.xml'))).toBe(true)

      const validate = execFileSync(process.execPath, [bin, 'validate', '--dir', outDir], { encoding: 'utf8' })
      expect(validate).toMatch(/newsml tree OK/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
