import type { Commune } from '@gra-maps/shared'
import { geoConverter } from '../geo.ts'
import type { Data } from '../model.ts'
import { addTo } from '../model.ts'
import { melodiGeography, melodiValue, readMelodi } from '../read/melodi.ts'

type SeriesKey = 'population' | 'birth' | 'death'

const TOTAL_LEVELS = new Set(['COM', 'DEP', 'REG'])

/** Key of an INSEE total in `data.inseeTotals`, e.g. `birth:DEP:01:2008`. */
export const totalKey = (series: string, level: string, id: string, year: number) => `${series}:${level}:${id}:${year}`

/**
 * Reads one yearly measure of a Melodi dataset into `commune.population[series]`, for
 * GEO_OBJECT=COM rows whose measure column is in `measures`. `measures` is in order of
 * preference: when a territory has several of them for the same year, only the first is kept
 * (never added up). Codes are converted to the
 * current geography (values of merged communes are summed). The DEP and REG rows of the same
 * file (INSEE's own totals) are kept in `data.inseeTotals` to check the aggregation.
 * Returns the years read.
 */
export async function readCommuneSeries(
  data: Data,
  file: string,
  series: SeriesKey,
  measureColumn: string,
  measures: readonly string[],
): Promise<Set<number>> {
  const geo = await geoConverter(await melodiGeography(file), new Set(data.communes.keys()))
  const years = new Set<number>()

  // `${GEO_OBJECT}:${GEO}:${year}` -> best measure found so far (lowest index) and its value.
  const best = new Map<string, { rank: number; value: number }>()
  await readMelodi(
    file,
    (row) => {
      const value = melodiValue(row)
      if (value === undefined) return
      const key = `${row.GEO_OBJECT}:${row.GEO}:${row.TIME_PERIOD}`
      const rank = measures.indexOf(row[measureColumn]!)
      const current = best.get(key)
      if (!current || rank < current.rank) best.set(key, { rank, value: Math.round(value) })
    },
    { keep: (row) => TOTAL_LEVELS.has(row.GEO_OBJECT!) && measures.includes(row[measureColumn]!) },
  )

  for (const [key, { value }] of best) {
    const [level, id, period] = key.split(':') as [string, string, string]
    const year = Number(period)
    if (level !== 'COM') {
      data.inseeTotals.set(totalKey(series, level, id, year), value)
      continue
    }
    const code = geo.toCurrent(id)
    if (!code) continue
    addTo(data.communes.get(code)!.population[series], year, value)
    years.add(year)
  }

  logUnknown(series, geo.unknown)
  return years
}

export function logUnknown(series: string, unknown: ReadonlySet<string>): void {
  const codes = [...unknown].filter((c) => !c.startsWith('97'))
  if (codes.length > 0)
    console.warn(`[${series}] ${codes.length} codes not in the COG: ${codes.slice(0, 10).join(', ')}${codes.length > 10 ? '...' : ''}`)
}

/** Communes that have no value at all in `series`. */
export const withoutSeries = (data: Data, series: SeriesKey): Commune[] =>
  [...data.communes.values()].filter((c) => Object.keys(c.population[series]).length === 0)
