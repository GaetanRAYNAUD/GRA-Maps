/**
 * Compares out/ with the reference output in reference/, file by file, with a tolerance
 * on floats. Every difference must be explained or fixed before publishing.
 *
 * reference/ mirrors the published layout (`communes/01001.json`, `jenks/area.json`...),
 * files plain or gzipped (out/ is plain JSON). Differences are grouped by field (years folded into `YYYY`), with
 * a count and a few examples. Usage: `npm run parity -w generator [-- --only communes/]`.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { OUT_DIR, REFERENCE_DIR } from './paths.ts'

const TOLERANCE = 1e-6

type Flat = Record<string, unknown>

function flatten(value: unknown, prefix = '', acc: Flat = {}): Flat {
  if (value && typeof value === 'object' && !Array.isArray(value))
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, acc)
  else acc[prefix] = Array.isArray(value) ? JSON.stringify(value) : value
  return acc
}

async function readJson(file: string): Promise<unknown> {
  const raw = await readFile(file)
  return JSON.parse((file.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'))
}

const equal = (a: unknown, b: unknown) =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a)) : a === b

type Diff = { count: number; files: Set<string>; examples: string[] }

async function main() {
  const { values } = parseArgs({ options: { only: { type: 'string' }, examples: { type: 'string', default: '3' } } })
  const maxExamples = Number(values.examples)

  let entries: string[]
  try {
    entries = (await readdir(REFERENCE_DIR, { recursive: true })).map((f) => f.split(path.sep).join('/'))
  } catch {
    throw new Error(`No reference output in ${REFERENCE_DIR} (see reference/README.md)`)
  }
  const keys = entries
    .filter((f) => /\.json(\.gz)?$/.test(f))
    .map((f) => f.replace(/\.gz$/, ''))
    .filter((k) => !values.only || k.startsWith(values.only))

  const diffs = new Map<string, Diff>()
  const note = (kind: string, file: string, field: string, detail: string) => {
    const id = `${kind.padEnd(8)} ${file.split('/')[0]}: ${field.replace(/(^|\.)\d{4}(?=\.|$)/g, '$1YYYY')}`
    let d = diffs.get(id)
    if (!d) diffs.set(id, (d = { count: 0, files: new Set(), examples: [] }))
    d.count++
    d.files.add(file)
    if (d.examples.length < maxExamples) d.examples.push(`${file} ${field}: ${detail}`)
  }

  let missingFiles = 0
  for (const key of keys) {
    const reference = flatten(await readJson(path.join(REFERENCE_DIR, entries.includes(key) ? key : `${key}.gz`)))
    let output: Flat
    try {
      output = flatten(await readJson(path.join(OUT_DIR, key)))
    } catch {
      missingFiles++
      note('no file', key, '-', 'missing in out/')
      continue
    }
    for (const [field, value] of Object.entries(reference)) {
      if (!(field in output)) note('missing', key, field, String(value))
      else if (!equal(value, output[field])) note('changed', key, field, `${String(value)} -> ${String(output[field])}`)
    }
    for (const field of Object.keys(output)) if (!(field in reference)) note('new', key, field, String(output[field]))
  }

  console.log(`${keys.length} reference files, ${missingFiles} missing in out/, ${diffs.size} kinds of differences`)
  for (const [id, d] of [...diffs].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n${id}  (${d.count} values, ${d.files.size} files)`)
    for (const example of d.examples) console.log(`    ${example}`)
  }
  if (diffs.size > 0) process.exitCode = 1
}

try {
  await main()
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
}
