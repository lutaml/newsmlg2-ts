#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { marked } from 'marked'
import { emitNewsml, loadMarkdownPosts, validateOutput } from '../dist/index.js'

const usage = 'usage: newsmlg2 emit --config spoke.yaml | validate --dir DIR'
const argv = process.argv.slice(2)
const command = argv.shift()
const flag = (name) => argv[argv.indexOf(name) + 1]

if (command === 'emit') {
  const cfg = parse(readFileSync(flag('--config') ?? 'spoke.yaml', 'utf8'))
  const posts = loadMarkdownPosts({ contentDir: cfg.contentDir })
  const n = emitNewsml({
    spoke: { id: cfg.id, name: cfg.name, base: cfg.base },
    posts,
    outDir: cfg.outDir,
    renderBody: (md) => marked.parse(md, { async: false }),
  })
  console.log(`newsml: ${n} item(s) -> ${cfg.outDir}`)
} else if (command === 'validate') {
  const errors = validateOutput(flag('--dir'))
  if (errors.length) {
    for (const e of errors) console.error(`- ${e}`)
    process.exit(1)
  }
  console.log('newsml tree OK')
} else {
  console.error(usage)
  process.exit(2)
}
