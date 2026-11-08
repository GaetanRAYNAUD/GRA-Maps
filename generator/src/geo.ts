import { readCsv } from './read/csv.ts'
import { sources } from './sources/registry.ts'

/**
 * Converts commune codes of a source published in an older geography to the geography of
 * the COG (see docs/geography.md), using the COG change file (v_mvt_commune).
 */
export type GeoConverter = {
  /** Current code of `code`, or undefined when it does not map to a known commune. */
  toCurrent(code: string): string | undefined
  /** Codes that did not map to a known commune, for the logs. */
  unknown: Set<string>
}

/** One change of the COG that moves the values of a commune to another code. */
export type Move = { date: string; from: string; to: string }

/** Changes that move the values of a commune to another code: mergers, new communes, code changes. */
const MOVES = new Set(['31', '32', '33', '34', '41', '50'])

/** Keeps the rows of v_mvt_commune that move a commune to another code, oldest first. */
export function movesFrom(rows: Record<string, string>[]): Move[] {
  return rows
    .filter((r) => MOVES.has(r.MOD!) && r.TYPECOM_AV === 'COM' && r.TYPECOM_AP === 'COM' && r.COM_AV !== r.COM_AP)
    .map((r) => ({ date: r.DATE_EFF!, from: r.COM_AV!, to: r.COM_AP! }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Converter from the geography in force on `sourceDate` (`YYYY-MM-DD`) to the one of `known`
 * codes. Only `moves` effective after that date apply, in chronological order, chained.
 */
export function buildConverter(moves: readonly Move[], sourceDate: string, known: ReadonlySet<string>): GeoConverter {
  const next = new Map<string, string>()
  for (const move of moves) {
    if (move.date <= sourceDate) continue
    // A later change of the target applies to every code already pointing to it.
    for (const [from, to] of next) if (to === move.from) next.set(from, move.to)
    next.set(move.from, move.to)
  }

  const unknown = new Set<string>()
  return {
    unknown,
    toCurrent(code) {
      if (known.has(code)) return code
      const current = next.get(code)
      if (current && known.has(current)) return current
      unknown.add(code)
      return undefined
    },
  }
}

let movesCache: Promise<Move[]> | undefined

/** Moves of the downloaded change file (v_mvt_commune), read once per run. */
export function loadMoves(): Promise<Move[]> {
  movesCache ??= readCsv(sources.communeChanges.file).then(movesFrom)
  return movesCache
}

/** Converter for a source in the geography of `sourceDate`, from the downloaded change file. */
export async function geoConverter(sourceDate: string, known: ReadonlySet<string>): Promise<GeoConverter> {
  return buildConverter(await loadMoves(), sourceDate, known)
}
