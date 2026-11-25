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

## Edit

Models are plain mutable objects — parse, mutate, rebuild:

```ts
import { editNewsItem, editNewsMessage, withdrawNewsItem } from 'newsmlg2-ts'

// from XML or from a model; mutation is in place, result re-serializes
const { model, toXml } = editNewsItem(xml, (item) => {
  item.contentMeta.headline = 'Corrected headline'
})

// withdrawal = pubStatus="withdrawn" on a NEW version (version + 1):
// a withdrawal is a new version of the item, never a silent edit
const withdrawn = withdrawNewsItem(xml)
```

`build → parse → build` is byte-identical. `contentMeta.bodyXhtml` is the
**unwrapped** XHTML: `build` adds the `<html xmlns="…">` envelope,
`parse` removes it — an edited item re-serializes identically.

## Repository toolkit

Beyond document parsing, the package reads and writes a **news repository**:
a static tree of NewsML-G2 files on disk.

```
<outDir>/newsml.xml                          index NewsMessage (metadata only)
<outDir>/articles/<YYYY-MM-DD>-<slug>/
  newsml.xml                                 full NewsItem (inline XHTML + renditions)
  body.md                                    source rendition
```

```ts
import { emitNewsml, loadMarkdownPosts, validateOutput } from 'newsmlg2-ts'

emitNewsml({
  spoke: { id: 'pubid', name: 'PubID', base: 'https://www.pubid.com' },
  posts: loadMarkdownPosts({ contentDir: 'src/content/blog' }),
  outDir: 'dist/news-data',
  renderBody: (md) => marked.parse(md, { async: false }),
})
validateOutput('dist/news-data') // [] = tree is sound
```

Or the CLI in a build: `newsmlg2 emit --config spoke.yaml`, then
`newsmlg2 validate --dir dist/news-data`. Posts are dated markdown
(`YYYY-MM-DD-slug.md`, filename date is authoritative); frontmatter keys:
`title`, `author`, `description` (or `excerpt`), `categories` (or
`subjects`), `draft`, `withdrawn`, `version`. Output is deterministic —
the index `sent` timestamp derives from the newest item, never the clock —
so emit-twice-compare is a valid CI gate.

Publisher identity lives in the spoke config (defaults shown):

```yaml
id: pubid                      # stable; part of every GUID
name: PubID                    # provider, byline, sender fallback
base: https://www.pubid.com
guidPrefix: urn:ribose:news:   # GUID namespace — permanent, choose once
postsPath: blog                # canonical links: <base>/<postsPath>/<date>-<slug>
sender: PubID                  # index NewsMessage sender (default: name)
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
