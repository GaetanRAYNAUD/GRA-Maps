import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline'
import type { Readable } from 'node:stream'
import yauzl from 'yauzl'

/** One line of a Melodi `_data.csv`, keyed by column name (FREQ, GEO, GEO_OBJECT, TIME_PERIOD, OBS_VALUE...). */
export type MelodiRow = Record<string, string>

/**
 * Opens the first entry of `zipFile` ending with `suffix`. The zip is closed when that stream
 * ends: yauzl's autoClose only fires once every entry has been read, which never happens here.
 */
function openEntry(zipFile: string, suffix: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFile, { lazyEntries: true, autoClose: false }, (err, zip) => {
      if (err) return reject(err)
      zip.on('entry', (entry: yauzl.Entry) => {
        if (!entry.fileName.endsWith(suffix)) return zip.readEntry()
        zip.openReadStream(entry, (e, stream) => {
          if (e) {
            zip.close()
            return reject(e)
          }
          stream.once('close', () => zip.close())
          resolve(stream)
        })
      })
      zip.on('end', () => {
        zip.close()
        reject(new Error(`${zipFile}: no entry ending with ${suffix}`))
      })
      zip.on('error', reject)
      zip.readEntry()
    })
  })
}

const unquote = (field: string) => (field.startsWith('"') && field.endsWith('"') ? field.slice(1, -1) : field)

/**
 * Streams the `_data.csv` of a Melodi zip and calls `onRow` for every line kept by `keep`.
 * Melodi files are `;` separated, fields quoted, no separator inside fields, so lines are
 * split directly: fast enough for the 180 MB census file. `prefilter` runs on the raw line
 * before splitting, to skip most lines cheaply (e.g. `'"SUP"'`).
 */
export async function readMelodi(
  zipFile: string,
  onRow: (row: MelodiRow) => void,
  { keep = () => true, prefilter }: { keep?: (row: MelodiRow) => boolean; prefilter?: string } = {},
): Promise<void> {
  const input = await openEntry(zipFile, '_data.csv')
  const lines = createInterface({ input, crlfDelay: Infinity })
  try {
    let columns: string[] | undefined
    for await (const raw of lines) {
      const line = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
      if (!columns) {
        columns = line.split(';').map(unquote)
        continue
      }
      if (!line || (prefilter && !line.includes(prefilter))) continue
      const fields = line.split(';')
      const row: MelodiRow = {}
      for (let i = 0; i < columns.length; i++) row[columns[i]!] = unquote(fields[i] ?? '')
      if (keep(row)) onRow(row)
    }
  } finally {
    // Ends the entry stream even when reading stopped early, which closes the zip.
    input.destroy()
  }
}

/** Catalog entry saved by the Melodi download next to the source file (see sources/melodi.ts). */
export const melodiCatalogFile = (file: string) => `${file}.catalog.json`

/** Geography date (`YYYY-MM-DD`) of a Melodi source, from its catalog entry (`spatialTemporal`, e.g. `2026-01-01T01:00:00`). */
export async function melodiGeography(file: string): Promise<string> {
  let text: string
  try {
    text = await readFile(melodiCatalogFile(file), 'utf8')
  } catch (e) {
    throw new Error(`${melodiCatalogFile(file)} is missing: delete ${path.basename(file)} and rerun to download both again`, { cause: e })
  }
  const entry = JSON.parse(text) as { identifier?: string; spatialTemporal?: string }
  if (!entry.spatialTemporal) throw new Error(`${entry.identifier ?? path.basename(file)}: no spatialTemporal in the catalog entry`)
  return entry.spatialTemporal.slice(0, 10)
}

/** Numeric value of a row, `undefined` when missing (status K or M). */
export function melodiValue(row: MelodiRow): number | undefined {
  const raw = row.OBS_VALUE
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}
