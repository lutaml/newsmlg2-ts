// Repository validation: structural + rendition-integrity gate over an
// emitted tree. Byte stability is enforced separately by emitting twice
// and comparing. GUIDs are parsed with the spoke's configured namespace
// (the same `guidPrefix` the emitter used), defaulting to the Ribose
// network scheme.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseNewsItem, parseNewsMessage } from '../parse.js'

export interface ValidateOptions {
  /** GUID namespace including the trailing colon; must match the emitter's. */
  guidPrefix?: string
}

export const validateOutput = (outDir: string, opts: ValidateOptions = {}): string[] => {
  const guidPrefix = opts.guidPrefix ?? 'urn:ribose:news:'
  let index
  try {
    index = parseNewsMessage(readFileSync(join(outDir, 'newsml.xml'), 'utf8'))
  } catch (e) {
    return [`index newsml.xml does not parse: ${e}`]
  }
  const errors: string[] = []
  for (const item of index.items) {
    const guid = item.itemMeta?.guid ?? ''
    if (!guid.startsWith(guidPrefix)) {
      errors.push(`guid not under ${JSON.stringify(guidPrefix)}: ${guid}`)
      continue
    }
    const [date, , slug] = guid.slice(guidPrefix.length).split(':')
    if (!date || !slug) {
      errors.push(`unparseable guid: ${guid}`)
      continue
    }
    const dir = join(outDir, 'articles', `${date}-${slug}`)
    let full
    try {
      full = parseNewsItem(readFileSync(join(dir, 'newsml.xml'), 'utf8'))
    } catch (e) {
      errors.push(`${date}-${slug}: full newsml.xml does not parse: ${e}`)
      continue
    }
    for (const r of full.contentMeta?.renditions ?? []) {
      if (!existsSync(join(dir, r.href ?? ''))) {
        errors.push(`${date}-${slug}: missing rendition ${r.href}`)
      }
    }
  }
  return errors
}
