import { readSheet } from 'read-excel-file/node'
import { geoConverter } from '../geo.ts'
import type { Data, Step } from '../model.ts'
import { addTo } from '../model.ts'
import { sources } from '../sources/registry.ts'
import { logUnknown, readCommuneSeries, withoutSeries } from './commune-series.ts'

/**
 * Population per commune and year, merged from two sources:
 *
 * - sources.population (Melodi DS_POPULATIONS_HISTORIQUES, 1968 onwards): zip with
 *   `<id>_data.csv` (FREQ;GEO;GEO_OBJECT;POPREF_MEASURE;TIME_PERIOD;OBS_VALUE), keep GEO_OBJECT=COM.
 * - sources.populationHistory (insee.fr page 3698339, 1876 onwards): xlsx, first sheet,
 *   5 title rows then a label row and a code row (CODGEO, REG, DEP, LIBGEO, then one column per
 *   year: PMUNyyyy since 2006, PSDCyyyy 1962-1999, PTOTyyyy 1876-1954). Paris by arrondissement,
 *   Lyon and Marseille as whole communes.
 *
 * Melodi wins for every (commune, year) it provides (1968-1999 as PSDC, 2006 onwards as PMUN);
 * the xlsx only fills the others (in practice 1876-1962). Before 2006 the concept differs (population
 * sans double compte, then population totale). The xlsx has no row for Paris as a whole
 * (75056): its arrondissements are summed. Both files are in an older geography than the COG:
 * codes are converted with v_mvt_commune (see docs/geography.md).
 */
export const populationStep: Step = {
  name: 'populationStep',
  async run(data) {
    const melodiYears = await readCommuneSeries(data, sources.population.file, 'population', 'POPREF_MEASURE', new Set(['PMUN', 'PSDC']))
    // Snapshot of what Melodi gave each commune: the xlsx only fills the other (commune, year) pairs.
    const fromMelodi = new Map([...data.communes.values()].map((c) => [c.id, new Set(Object.keys(c.population.population).map(Number))]))
    const historyYears = await readHistory(data, fromMelodi)

    const missing = withoutSeries(data, 'population').length
    console.log(
      `[population] Melodi ${range(melodiYears)}, xlsx ${range(historyYears)}${missing ? `, ${missing} communes without population` : ''}`,
    )
  },
}

const range = (years: Set<number>) => (years.size ? `${Math.min(...years)}-${Math.max(...years)} (${years.size} years)` : 'none')

/** Reads the xlsx history for the (commune, year) pairs Melodi does not provide. Returns the years read. */
async function readHistory(data: Data, fromMelodi: ReadonlyMap<string, ReadonlySet<number>>): Promise<Set<number>> {
  const rows = (await readSheet(sources.populationHistory.file, 1)) as unknown[][]
  const geographyDate = rows
    .slice(0, 5)
    .map((r) => String(r[0] ?? '').match(/Géographie au (\d{2})\/(\d{2})\/(\d{4})/))
    .find(Boolean)
  if (!geographyDate) throw new Error('population history: geography date not found in the title rows')
  const geo = await geoConverter(`${geographyDate[3]}-${geographyDate[2]}-${geographyDate[1]}`, new Set(data.communes.keys()))

  const header = rows.findIndex((r) => r[0] === 'CODGEO')
  if (header < 0) throw new Error('population history: CODGEO header row not found')
  const columns = rows[header]!.map((c, i) => ({ index: i, year: Number(String(c).match(/^P(?:MUN|SDC|TOT)(\d{4})$/)?.[1]) }))
  const yearColumns = columns.filter((c) => Number.isFinite(c.year))

  const years = new Set<number>()
  for (const row of rows.slice(header + 1)) {
    const raw = String(row[0] ?? '')
    if (!raw) continue
    const code = geo.toCurrent(data.arrondissements.get(raw) ?? raw)
    if (!code) continue
    const population = data.communes.get(code)!.population.population
    const skip = fromMelodi.get(code)
    for (const { index, year } of yearColumns) {
      const value = row[index]
      if (typeof value !== 'number' || skip?.has(year)) continue
      addTo(population, year, value)
      years.add(year)
    }
  }
  logUnknown('population history', geo.unknown)
  return years
}
