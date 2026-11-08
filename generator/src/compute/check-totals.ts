import type { Data } from '../model.ts'
import { totalKey } from '../steps/commune-series.ts'

const SERIES = ['population', 'birth', 'death'] as const

export type TotalsReport = { series: string; compared: number; mismatches: string[] }

/**
 * Compares the departement and region totals summed by the generator with the totals INSEE
 * publishes in the same files (`data.inseeTotals`). A mismatch means a commune was lost or
 * counted twice, typically by the geography conversion. Years INSEE gives no total for (the
 * 1876-1962 history) are not checked.
 */
export function checkTotals(data: Data): TotalsReport[] {
  return SERIES.map((series) => {
    let compared = 0
    const mismatches: string[] = []
    for (const [level, nodes] of [
      ['DEP', data.departements],
      ['REG', data.regions],
    ] as const) {
      for (const node of nodes.values()) {
        for (const [year, value] of Object.entries(node.population[series])) {
          const expected = data.inseeTotals.get(totalKey(series, level, node.id, Number(year)))
          if (expected === undefined) continue
          compared++
          if (expected !== value) mismatches.push(`${level} ${node.id} ${year}: INSEE ${expected}, generated ${value}`)
        }
      }
    }
    return { series, compared, mismatches }
  })
}

/** Logs the report: one line per series, and up to 5 mismatches each. */
export function logTotals(reports: TotalsReport[]): void {
  for (const { series, compared, mismatches } of reports) {
    if (mismatches.length === 0) {
      console.log(`[check] ${series}: ${compared} departement and region totals match INSEE`)
      continue
    }
    console.warn(`[check] ${series}: ${mismatches.length} of ${compared} totals differ from INSEE`)
    for (const m of mismatches.slice(0, 5)) console.warn(`  ${m}`)
  }
}
