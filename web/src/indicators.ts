import type { CommunePopulations, DataNode, DataPopulations, JenksKind, Level, Year } from '@gra-maps/shared'

type Series = Record<Year, number>
type SeriesKey = keyof CommunePopulations

export type Scope = 'country' | 'region' | 'departement'

export type Indicator = {
  slug: string
  kind: JenksKind
  label: string
  /** Unit after a value: "12 hab./km²". */
  unit: string
  /** Phrase after the headline value, before the year: "habitants en 2022". */
  phrase: string
  /** One line under the label in the indicator picker. */
  hint: string
  group: 'Population' | 'État civil'
  decimals: number
  /** Area has a single value, the others one value per year. */
  yearly: boolean
  series?: SeriesKey
  ranks?: Record<Scope, SeriesKey>
  percents?: Record<Scope, SeriesKey>
}

export const indicators: Indicator[] = [
  {
    slug: 'population',
    hint: "Nombre d'habitants",
    group: 'Population',
    kind: 'population',
    label: 'Population',
    unit: 'hab.',
    phrase: 'habitants',
    decimals: 0,
    yearly: true,
    series: 'population',
    ranks: { country: 'countryRanks', region: 'regionRanks', departement: 'departementRanks' },
    percents: { country: 'percentCountry', region: 'percentRegion', departement: 'percentDepartement' },
  },
  {
    slug: 'densite',
    hint: 'Habitants par km²',
    group: 'Population',
    kind: 'density',
    label: 'Densité',
    unit: 'hab./km²',
    phrase: 'habitants par km²',
    decimals: 1,
    yearly: true,
    series: 'density',
    ranks: { country: 'densityCountryRanks', region: 'densityRegionRanks', departement: 'densityDepartementRanks' },
  },
  {
    slug: 'naissances',
    hint: 'Naissances dans l’année',
    group: 'État civil',
    kind: 'birth',
    label: 'Naissances',
    unit: 'naiss.',
    phrase: 'naissances',
    decimals: 0,
    yearly: true,
    series: 'birth',
    ranks: { country: 'birthCountryRanks', region: 'birthRegionRanks', departement: 'birthDepartementRanks' },
    percents: { country: 'birthPercentCountry', region: 'birthPercentRegion', departement: 'birthPercentDepartement' },
  },
  {
    slug: 'deces',
    hint: 'Décès dans l’année',
    group: 'État civil',
    kind: 'death',
    label: 'Décès',
    unit: 'décès',
    phrase: 'décès',
    decimals: 0,
    yearly: true,
    series: 'death',
    ranks: { country: 'deathCountryRanks', region: 'deathRegionRanks', departement: 'deathDepartementRanks' },
    percents: { country: 'deathPercentCountry', region: 'deathPercentRegion', departement: 'deathPercentDepartement' },
  },
  {
    slug: 'natalite',
    hint: 'Naissances pour 1 000 habitants',
    group: 'État civil',
    kind: 'birth-per-capita',
    label: 'Natalité',
    unit: '‰',
    phrase: 'naissances pour 1 000 habitants',
    decimals: 1,
    yearly: true,
    series: 'birthPerCapita',
    ranks: {
      country: 'birthPerCapitaCountryRanks',
      region: 'birthPerCapitaRegionRanks',
      departement: 'birthPerCapitaDepartementRanks',
    },
  },
  {
    slug: 'mortalite',
    hint: 'Décès pour 1 000 habitants',
    group: 'État civil',
    kind: 'death-per-capita',
    label: 'Mortalité',
    unit: '‰',
    phrase: 'décès pour 1 000 habitants',
    decimals: 1,
    yearly: true,
    series: 'deathPerCapita',
    ranks: {
      country: 'deathPerCapitaCountryRanks',
      region: 'deathPerCapitaRegionRanks',
      departement: 'deathPerCapitaDepartementRanks',
    },
  },
  {
    slug: 'superficie',
    hint: 'Surface en km², sans année',
    group: 'Population',
    kind: 'area',
    label: 'Superficie',
    unit: 'km²',
    phrase: 'km²',
    decimals: 2,
    yearly: false,
  },
]

export const defaultIndicator = indicators[0]!

export const indicatorBySlug = (slug: string | null): Indicator => indicators.find((i) => i.slug === slug) ?? defaultIndicator

type AnyNode = DataNode<DataPopulations> & {
  areaRegionRanks?: number
  areaDepartementRanks?: number
}

function seriesOf(node: AnyNode, key: SeriesKey | undefined): Series | undefined {
  if (!key) return undefined
  return (node.population as Partial<CommunePopulations>)[key]
}

/** Values by year; area is returned as a single value with no year. */
export function seriesFor(indicator: Indicator, node: AnyNode): Series | undefined {
  return seriesOf(node, indicator.series)
}

export function valueFor(indicator: Indicator, node: AnyNode, year: Year): number | undefined {
  if (!indicator.yearly) return node.area
  return seriesFor(indicator, node)?.[year]
}

export function rankFor(indicator: Indicator, node: AnyNode, year: Year, scope: Scope): number | undefined {
  if (!indicator.yearly) {
    if (scope === 'country') return node.areaCountryRanks
    if (scope === 'region') return node.areaRegionRanks
    return node.areaDepartementRanks
  }
  return seriesOf(node, indicator.ranks?.[scope])?.[year]
}

export function percentFor(indicator: Indicator, node: AnyNode, year: Year, scope: Scope): number | undefined {
  return seriesOf(node, indicator.percents?.[scope])?.[year]
}

/** Scopes a node of this level can be ranked in, widest first. */
export function scopesFor(level: Level): Scope[] {
  if (level === 'REGION') return ['country']
  if (level === 'DEPARTEMENT') return ['country', 'region']
  return ['country', 'region', 'departement']
}

const formatters = new Map<number, Intl.NumberFormat>()

export function formatNumber(value: number, decimals = 0): string {
  let formatter = formatters.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })
    formatters.set(decimals, formatter)
  }
  return formatter.format(value)
}

export const formatValue = (indicator: Indicator, value: number) => formatNumber(value, indicator.decimals)

export function formatRank(rank: number): string {
  return rank === 1 ? '1ʳᵉ' : `${formatNumber(rank)}ᵉ`
}
