// Canonical XML serializer driven by the element tables, plus the parse
// projection for the subset. Output shape mirrors the Ruby reference gem
// (2-space pretty, declaration, default NAR namespace on the root).
import type { El } from './tables.js'

const NAR = 'http://iptc.org/std/nar/2006-10-01/'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const renderAttrs = (attrs: Record<string, string | number | undefined>): string =>
  Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => ` ${k}="${esc(String(v))}"`)
    .join('')

const render = (el: El, obj: unknown, depth: number, root: boolean): string => {
  const value = el.get ? el.get(obj) : obj
  if (value === undefined || value === null || value === '') return ''
  if (Array.isArray(value)) {
    return value.map((v) => render({ ...el, get: undefined }, v, depth, false).trimStart()).join('')
  }
  const attrs = el.attrs ? renderAttrs(el.attrs(value)) : ''
  const ns = root ? ` xmlns="${NAR}"` : ''
  const pad = '  '.repeat(depth)
  const innerPad = '  '.repeat(depth + 1)
  if (el.children?.length) {
    const inner = el.children
      .map((c) => render(c, value, depth + 1, false))
      .filter(Boolean)
      .join('')
    if (inner === '' && attrs === '') return '' // optional element, nothing to say
    return `\n${pad}<${el.name}${ns}${attrs}>${inner}\n${pad}</${el.name}>`
  }
  const text = el.text ? el.text(value) : undefined
  if (text !== undefined && text !== '') {
    return `\n${pad}<${el.name}${ns}${attrs}>${esc(text)}</${el.name}>`
  }
  if (attrs === '') return '' // optional leaf, nothing to say
  return `\n${pad}<${el.name}${ns}${attrs}/>`
}

export const serialize = (table: El, obj: unknown): string => {
  const body = render(table, obj, 0, true).replace(/^\n/, '')
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`
}
