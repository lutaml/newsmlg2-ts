# newsmlg2-ts

NewsML-G2 (IPTC 2.35, power) codec subset for TypeScript: parse and build
`NewsMessage`/`NewsItem` with inline XHTML content and `remoteContent`
renditions. The TypeScript sibling of the reference implementation
[`newsmlg2-ruby`](https://github.com/lutaml/newsmlg2-ruby); both are pinned
together by the shared [newsmlg2-fixtures] golden files.

[newsmlg2-fixtures]: https://github.com/lutaml/newsmlg2-fixtures

## Usage

```ts
import { buildNewsItem, buildNewsMessage, parseNewsMessage, parseNewsItem } from 'newsmlg2-ts'

const { toXml } = buildNewsItem({
  itemMeta: { guid: 'urn:ribose:news:2026-09-01:pubid:release', lang: 'en',
    itemClass: 'ninat:text', provider: { qcode: 'nprov:pubid', name: 'PubID' },
    versionCreated: '2026-09-01T09:00:00+00:00' },
  contentMeta: { headline: 'PubID 1.0 released', by: 'PubID team',
    bodyXhtml: '<p>…</p>',
    renditions: [{ href: 'body.adoc', mimetype: 'text/asciidoc', rendition: 'body-adoc' }] },
})
toXml() // canonical pretty XML, byte-shape identical to the Ruby gem

const msg = parseNewsMessage(xml) // { header: {sent, sender}, items: [...] }
```

## Design

- **Declarative tables** (`src/tables.ts`) drive a single generic serializer
  (`src/codec.ts`) — adding an element is a new table row, never new
  serializer code.
- **Parse projection** (`src/parse.ts`) maps XML to typed models.
- **Vendored IPTC catalog** (`src/catalogs/iptc-g2.json`, from
  IPTC-G2-Standards v41) resolves qcodes offline (`qcodeToUri`).
- Serialization output is byte-shape identical to newsmlg2-ruby (asserted
  against the shared goldens in CI).

## Conformance

`NEWSMLG2_FIXTURES=<path to newsmlg2-fixtures> npm test` runs the golden
suite: parses the Ruby-generated goldens and the IPTC official examples,
round-trips built documents, and resolves catalog qcodes.

## License

BSD-2-Clause. NewsML-G2 is a trademark of the IPTC; not affiliated.
