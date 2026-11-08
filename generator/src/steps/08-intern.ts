import type { CommunePopulations, DataJenksNode, Jenks, JenksByYear } from '@gra-maps/shared'
import { checkTotals, logTotals } from '../compute/check-totals.ts'
import { jenksClassifier } from '../compute/jenks.ts'
import { floor1, percent, ranker } from '../compute/ranks.ts'
import type { Data, Step } from '../model.ts'
import { addTo } from '../model.ts'

type Series = Record<number, number>
type SeriesKey = keyof CommunePopulations
type Node = { id: string; area?: number; population: CommunePopulations }
type GroupOf = (node: Node) => string | undefined

/**
 * Everything computed from the sources:
 * 1. population, births and deaths of departements (sum of their communes) and regions (sum
 *    of their departements), checked against the totals INSEE publishes;
 * 2. density (inhabitants per km², floored to 1 decimal) and births and deaths per 1,000
 *    inhabitants (floored to 1 decimal, only for years with a population);
 * 3. ranks within the country, the region and the departement, and shares of the parent
 *    totals (computed from the communes) for population, births and deaths; ranks only for
 *    area, density and per capita values;
 * 4. Jenks classes of every indicator and year, per level (see compute/jenks.ts).
 */
export const internStep: Step = {
  name: 'internStep',
  run(data) {
    aggregate(data)
    logTotals(checkTotals(data))
    derive(data)
    rankAll(data)
    data.jenks = computeJenks(data)
  },
}

const nodes = <T extends Node>(map: Map<string, T>): Node[] => [...map.values()]
const entries = (series: Series) => Object.entries(series).map(([year, value]) => [Number(year), value] as const)

function aggregate(data: Data): void {
  const summed: SeriesKey[] = ['population', 'birth', 'death']
  const add = (target: Node, source: Node | undefined) => {
    if (source) for (const key of summed) for (const [y, v] of entries(source.population[key])) addTo(target.population[key], y, v)
  }
  for (const departement of data.departements.values()) for (const id of departement.communes) add(departement, data.communes.get(id))
  for (const region of data.regions.values()) for (const id of region.departements) add(region, data.departements.get(id))
}

function derive(data: Data): void {
  for (const node of [...nodes(data.regions), ...nodes(data.departements), ...nodes(data.communes)]) {
    const p = node.population
    for (const [year, population] of entries(p.population)) {
      if (node.area && node.area > 0) p.density[year] = floor1(population, node.area)
      for (const [count, perCapita] of [
        [p.birth, p.birthPerCapita],
        [p.death, p.deathPerCapita],
      ] as const) {
        const value = count[year]
        if (value !== undefined) perCapita[year] = value === 0 || population === 0 ? 0 : floor1(value * 1000, population)
      }
    }
  }
}

/** Ranks `get` of every item within its group (by `groupOf`) and year, writing into `target`. */
function rankWithin(items: Node[], groupOf: GroupOf, get: (n: Node) => Series, target: (n: Node) => Series): void {
  const groups = new Map<string, Map<number, number[]>>()
  for (const item of items) {
    const group = groupOf(item)
    if (group === undefined) continue
    let years = groups.get(group)
    if (!years) groups.set(group, (years = new Map()))
    for (const [year, value] of entries(get(item))) {
      let list = years.get(year)
      if (!list) years.set(year, (list = []))
      list.push(value)
    }
  }
  const rankers = new Map([...groups].map(([group, years]) => [group, new Map([...years].map(([y, list]) => [y, ranker(list)]))]))
  for (const item of items) {
    const byYear = rankers.get(groupOf(item) ?? '')
    if (byYear) for (const [year, value] of entries(get(item))) target(item)[year] = byYear.get(year)!(value)
  }
}

/** Totals of `get` per group and year. */
function totals(items: Node[], groupOf: GroupOf, get: (n: Node) => Series): Map<string, Series> {
  const result = new Map<string, Series>()
  for (const item of items) {
    const group = groupOf(item)
    if (group === undefined) continue
    let total = result.get(group)
    if (!total) result.set(group, (total = {}))
    for (const [year, value] of entries(get(item))) addTo(total, year, value)
  }
  return result
}

function writePercents(items: Node[], groupOf: GroupOf, totalsByGroup: Map<string, Series>, get: (n: Node) => Series, key: SeriesKey) {
  for (const item of items) {
    const total = totalsByGroup.get(groupOf(item) ?? '')
    if (!total) continue
    for (const [year, value] of entries(get(item))) {
      const t = total[year]
      if (t) item.population[key][year] = percent(value, t)
    }
  }
}

type Targets = { country: (n: Node) => Series; region: (n: Node) => Series; departement: (n: Node) => Series }
const targets = (country: SeriesKey, region: SeriesKey, departement: SeriesKey): Targets => ({
  country: (n) => n.population[country],
  region: (n) => n.population[region],
  departement: (n) => n.population[departement],
})

function rankAll(data: Data): void {
  const communes = nodes(data.communes)
  const departements = nodes(data.departements)
  const regions = nodes(data.regions)
  const country: GroupOf = () => 'FR'
  const communeDepartement: GroupOf = (n) => data.communes.get(n.id)?.departement
  const communeRegion: GroupOf = (n) => data.departements.get(communeDepartement(n) ?? '')?.region
  const departementRegion: GroupOf = (n) => data.departements.get(n.id)?.region

  /** Ranks within the country, region and departement, at the levels where each scope exists. */
  const rank = (get: (n: Node) => Series, to: Targets) => {
    rankWithin(communes, country, get, to.country)
    rankWithin(communes, communeRegion, get, to.region)
    rankWithin(communes, communeDepartement, get, to.departement)
    rankWithin(departements, country, get, to.country)
    rankWithin(departements, departementRegion, get, to.region)
    rankWithin(regions, country, get, to.country)
  }

  /** Shares of the parent totals, all computed from the communes. */
  const share = (key: SeriesKey, [toCountry, toRegion, toDepartement]: [SeriesKey, SeriesKey, SeriesKey]) => {
    const get = (n: Node) => n.population[key]
    const byCountry = totals(communes, country, get)
    const byRegion = totals(communes, communeRegion, get)
    writePercents(communes, country, byCountry, get, toCountry)
    writePercents(communes, communeRegion, byRegion, get, toRegion)
    writePercents(communes, communeDepartement, totals(communes, communeDepartement, get), get, toDepartement)
    writePercents(departements, country, byCountry, get, toCountry)
    writePercents(departements, departementRegion, byRegion, get, toRegion)
    writePercents(regions, country, byCountry, get, toCountry)
  }

  const of = (key: SeriesKey) => (n: Node) => n.population[key]
  rank(of('population'), targets('countryRanks', 'regionRanks', 'departementRanks'))
  rank(of('birth'), targets('birthCountryRanks', 'birthRegionRanks', 'birthDepartementRanks'))
  rank(of('death'), targets('deathCountryRanks', 'deathRegionRanks', 'deathDepartementRanks'))
  rank(of('density'), targets('densityCountryRanks', 'densityRegionRanks', 'densityDepartementRanks'))
  rank(of('birthPerCapita'), targets('birthPerCapitaCountryRanks', 'birthPerCapitaRegionRanks', 'birthPerCapitaDepartementRanks'))
  rank(of('deathPerCapita'), targets('deathPerCapitaCountryRanks', 'deathPerCapitaRegionRanks', 'deathPerCapitaDepartementRanks'))
  share('population', ['percentCountry', 'percentRegion', 'percentDepartement'])
  share('birth', ['birthPercentCountry', 'birthPercentRegion', 'birthPercentDepartement'])
  share('death', ['deathPercentCountry', 'deathPercentRegion', 'deathPercentDepartement'])

  // Area is a single value: rank it as a one-entry series, then copy the ranks to their fields.
  const areaRanks = new Map<Node, { country: Series; region: Series; departement: Series }>()
  const slot = (n: Node) => {
    let s = areaRanks.get(n)
    if (!s) areaRanks.set(n, (s = { country: {}, region: {}, departement: {} }))
    return s
  }
  rank((n): Series => (n.area === undefined ? {} : { 0: n.area }), {
    country: (n) => slot(n).country,
    region: (n) => slot(n).region,
    departement: (n) => slot(n).departement,
  })
  for (const c of data.communes.values()) {
    const s = slot(c)
    c.areaCountryRanks = s.country[0]
    c.areaRegionRanks = s.region[0]
    c.areaDepartementRanks = s.departement[0]
  }
  for (const d of data.departements.values()) {
    const s = slot(d)
    d.areaCountryRanks = s.country[0]
    d.areaRegionRanks = s.region[0]
  }
  for (const r of data.regions.values()) r.areaCountryRanks = slot(r).country[0]
}

function jenksNode(data: Data, get: (node: Node) => number | undefined): DataJenksNode {
  const level = (items: Node[]) => {
    const kept = items.flatMap((n) => {
      const v = get(n)
      return v === undefined ? [] : [[n.id, v] as const]
    })
    const classOf = jenksClassifier(kept.map(([, v]) => v))
    const classes: Record<string, number> = {}
    let max = 0
    for (const [id, v] of kept) max = Math.max(max, (classes[id] = classOf(v)))
    return [classes, max] as const
  }
  const [regions, nbRegions] = level(nodes(data.regions))
  const [departements, nbDepartements] = level(nodes(data.departements))
  const [communes, nbCommunes] = level(nodes(data.communes))
  return { regions, nbRegions, departements, nbDepartements, communes, nbCommunes }
}

/** One Jenks node per year present in the regions' series. */
function jenksByYear(data: Data, key: SeriesKey): JenksByYear {
  const years = new Set<number>()
  for (const region of data.regions.values()) for (const [year] of entries(region.population[key])) years.add(year)
  const result: JenksByYear = {}
  for (const year of [...years].sort((a, b) => a - b)) result[year] = jenksNode(data, (n) => n.population[key][year])
  return result
}

function computeJenks(data: Data): Jenks {
  return {
    area: jenksNode(data, (n) => n.area),
    population: jenksByYear(data, 'population'),
    density: jenksByYear(data, 'density'),
    birth: jenksByYear(data, 'birth'),
    death: jenksByYear(data, 'death'),
    birthPerCapita: jenksByYear(data, 'birthPerCapita'),
    deathPerCapita: jenksByYear(data, 'deathPerCapita'),
  }
}
