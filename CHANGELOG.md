# Changelog

## [Unreleased]

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
