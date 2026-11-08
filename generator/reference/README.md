Reference output for `npm run parity -w generator` (not versioned): same layout as `out/`
(`communes/01001.json`, `regions/11.json`, `jenks/area.json`...), files plain or gzipped.

The old site still serves its files, e.g.:

```bash
curl -o communes/01001.json https://maps.gaetanraynaud.fr/data/communes/01001.json
```

Those files are incomplete (some communes have no population at all), so many differences
are expected: see docs/migration.md.
