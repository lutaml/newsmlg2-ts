# Changelog

## [0.2.0] - 2026-11-26

### Added

- **AsciiDoc post discovery**: `loadMarkdownPosts` accepts dated `.adoc`
  files beside markdown — hub-corpus shape (YAML frontmatter, doctitle
  fallback, author objects, frontmatter `lang`, `langFallback`).
  `Post.format` ('md' | 'adoc') and `renderBody(body, post)` make body
  rendering format-aware; spokes can emit from AsciiDoc corpora without
  conversion.
- Story grouping and publisher identity configuration (see 0.1.2 notes;
  released forward with this tag).

## [0.1.2] - 2026-11-26


### Added

- Publisher identity is configuration (closes #3): `Spoke` gains
  `guidPrefix` (GUID URN namespace, trailing colon included — permanent
  identifier; default `urn:ribose:news:`), `sender` (index NewsMessage
  sender; default falls back to `name`), and `postsPath` (canonical link
  path prefix; default `blog`). The validator parses the configured
  namespace (`validateOutput(dir, { guidPrefix })`) and flags GUIDs under
  a foreign scheme.
- Front-matter description and categories (closes #4): `description`
  (or `excerpt`) → `contentMeta/description`; `categories` (or
  `subjects`) → `contentMeta/subjects` as plain names. Emitted on both
  the index and full items.

### Fixed

- `bin/newsmlg2.mjs` is committed with the executable bit — git-dependency
  installs keep the committed mode, and the CLI failed with
  `Permission denied` when pinned from a tag.

### Changed

- Index NewsMessage `sender` now derives from the spoke (`sender` or
  `name`) instead of the literal `Ribose` — a one-line diff in existing
  emitted indexes.

## [0.1.1] - 2026-11-25

### Added

- **Repository toolkit** (the former `@riboseinc/newsml-spoke`, folded in
  before first release): `emitNewsml` (posts → the static NewsML-G2 tree:
  index NewsMessage + `articles/<date>-<slug>/newsml.xml` + `body.md`
  renditions), `loadMarkdownPosts` (dated-markdown discovery with
  frontmatter), `validateOutput` (structural + rendition-integrity gate),
  and the `newsmlg2` CLI (`emit --config spoke.yaml`, `validate --dir`).
  Deterministic: the index `sent` timestamp derives from the newest item's
  date. Withdrawal (`withdrawn: true` frontmatter → `pubStatus="withdrawn"`
  on a bumped version) and explicit `version` (corrections) go through the
  edit API.
- Edit API: `editNewsItem` / `editNewsMessage` (parse → mutate → build;
  mutation is in place on the model), and `withdrawNewsItem` — sets
  `pubStatus="withdrawn"` on a NEW version (version + 1; a withdrawal is a
  new version of the item, never a silent edit).
- Round-trip guarantee: `build → parse → build` is byte-identical,
  including full items (provider, embargo, canonical, subjects, located,
  renditions) and whole messages.
- CI workflow; CLI smoke tests.

### Changed

- **Parse output change:** `contentMeta.bodyXhtml` no longer includes the
  `<html xmlns="…">` envelope — `parse` unwraps what `build` wraps, so a
  parsed item re-serializes identically. Consumers that stripped the
  wrapper themselves (e.g. the hub's `stripHtmlWrapper`) can stop; inputs
  without the wrapper are unaffected.
