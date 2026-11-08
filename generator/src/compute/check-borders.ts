import { loadMoves, type Move } from '../geo.ts'
import type { Data } from '../model.ts'
import { fetchWithTimeout } from '../sources/download.ts'

/**
 * Borders drawn by the front come from the data.gouv.fr vector tiles (see docs/geography.md),
 * whose geography can lag behind the COG used for the data. The map joins shapes and data by
 * commune code, so a merger made after the tiles leaves a new commune without shape and old
 * communes without data. This check dates the tiles (Last-Modified of a tile) and lists the
 * COG changes made since.
 */
const TILE_URL = 'https://openmaptiles.data.gouv.fr/data/decoupage-administratif/3/4/2.pbf'

export type BordersReport = {
  /** Current communes whose shape differs from the tiles (new or absorbing communes). */
  changed: string[]
  /** Former codes still drawn by the tiles but no longer in the data. */
  gone: string[]
}

/** COG changes effective after `tilesDate` (`YYYY-MM-DD`), as seen by the map. */
export function bordersReport(moves: readonly Move[], tilesDate: string, known: ReadonlySet<string>): BordersReport {
  const after = moves.filter((m) => m.date > tilesDate)
  const changed = new Set(after.map((m) => m.to).filter((code) => known.has(code)))
  const gone = new Set(after.map((m) => m.from).filter((code) => !known.has(code)))
  return { changed: [...changed].sort(), gone: [...gone].sort() }
}

/** Date (`YYYY-MM-DD`) of the tiles, from the Last-Modified header of one tile. */
async function tilesDate(): Promise<string> {
  const res = await fetchWithTimeout(TILE_URL)
  await res.body?.cancel()
  const lastModified = res.headers.get('last-modified')
  if (!res.ok || !lastModified) throw new Error(`GET ${TILE_URL}: HTTP ${res.status}, no Last-Modified`)
  return new Date(lastModified).toISOString().slice(0, 10)
}

/** Logs the communes the map draws with outdated borders. Never fails the generation. */
export async function checkBorders(data: Data): Promise<void> {
  let date: string
  try {
    date = await tilesDate()
  } catch (e) {
    console.warn(`[borders] could not date the tiles: ${e instanceof Error ? e.message : String(e)}`)
    return
  }
  const { changed, gone } = bordersReport(await loadMoves(), date, new Set(data.communes.keys()))
  if (changed.length === 0 && gone.length === 0) {
    console.log(`[borders] tiles of ${date}: no commune change since, borders match the data`)
    return
  }
  const list = (codes: string[]) => `${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''}`
  console.warn(`[borders] tiles of ${date} predate COG changes: the map will draw outdated borders (see docs/geography.md)`)
  if (changed.length) console.warn(`  ${changed.length} communes without their current shape: ${list(changed)}`)
  if (gone.length) console.warn(`  ${gone.length} former communes still drawn, without data: ${list(gone)}`)
}
