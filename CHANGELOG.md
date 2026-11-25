# Changelog

## [Unreleased]

### Added

- Edit API: `editNewsItem` / `editNewsMessage` (parse → mutate → build;
  mutation is in place on the model), and `withdrawNewsItem` — sets
  `pubStatus="withdrawn"` on a NEW version (version + 1; a withdrawal is a
  new version of the item, never a silent edit).
- Round-trip guarantee: `build → parse → build` is byte-identical,
  including full items (provider, embargo, canonical, subjects, located,
  renditions) and whole messages.

### Changed

- **Parse output change:** `contentMeta.bodyXhtml` no longer includes the
  `<html xmlns="…">` envelope — `parse` unwraps what `build` wraps, so a
  parsed item re-serializes identically. Consumers that stripped the
  wrapper themselves (e.g. the hub's `stripHtmlWrapper`) can stop; inputs
  without the wrapper are unaffected.
