/**
 * Shape of the published JSON files. Empty series (`{}`) are left out of the files, so every
 * `Record<Year, number>` may be missing at runtime: read them with a fallback.
 * Ranks start at 1 for the highest value; tied values share the last position of their tie
 * (rank = number of values greater than or equal to the value).
 * Percentages are shares of the parent total (country, region, departement), 3 decimals.
 */

export type Year = number

export const Level = {
  COMMUNE: 'COMMUNE',
  DEPARTEMENT: 'DEPARTEMENT',
  REGION: 'REGION',
} as const
export type Level = (typeof Level)[keyof typeof Level]

export type Common = {
  communes: string[]
  departements: string[]
  regions: string[]
}

/**
 * Jenks class index (0-based, ascending values) of every node, for one indicator (and one
 * year). A level without any value has no map at all (empty objects are left out), and nodes
 * without a value are absent from their map. `nb*` is the highest class index of the level.
 */
export type DataJenksNode = {
  regions?: Record<string, number>
  nbRegions: number
  departements?: Record<string, number>
  nbDepartements: number
  communes?: Record<string, number>
  nbCommunes: number
}

/** `jenks/area.json` holds a single node; the others are keyed by year. */
export type JenksArea = DataJenksNode
export type JenksByYear = Record<Year, DataJenksNode>

/** Content of every `jenks/*.json` file, keyed like the population series they classify. */
export type Jenks = {
  area: JenksArea
  population: JenksByYear
  density: JenksByYear
  birth: JenksByYear
  death: JenksByYear
  birthPerCapita: JenksByYear
  deathPerCapita: JenksByYear
}

export type Point = {
  lat: number
  lon: number
}

export type DataPopulations = {
  population: Record<Year, number>
  countryRanks: Record<Year, number>
  density: Record<Year, number>
  densityCountryRanks: Record<Year, number>
  percentCountry: Record<Year, number>
  birth: Record<Year, number>
  death: Record<Year, number>
  birthCountryRanks: Record<Year, number>
  deathCountryRanks: Record<Year, number>
  birthPercentCountry: Record<Year, number>
  deathPercentCountry: Record<Year, number>
  birthPerCapita: Record<Year, number>
  deathPerCapita: Record<Year, number>
  birthPerCapitaCountryRanks: Record<Year, number>
  deathPerCapitaCountryRanks: Record<Year, number>
}

export type DepartementPopulations = DataPopulations & {
  regionRanks: Record<Year, number>
  densityRegionRanks: Record<Year, number>
  percentRegion: Record<Year, number>
  birthRegionRanks: Record<Year, number>
  deathRegionRanks: Record<Year, number>
  birthPercentRegion: Record<Year, number>
  deathPercentRegion: Record<Year, number>
  birthPerCapitaRegionRanks: Record<Year, number>
  deathPerCapitaRegionRanks: Record<Year, number>
}

export type CommunePopulations = DepartementPopulations & {
  departementRanks: Record<Year, number>
  densityDepartementRanks: Record<Year, number>
  percentDepartement: Record<Year, number>
  birthDepartementRanks: Record<Year, number>
  deathDepartementRanks: Record<Year, number>
  birthPercentDepartement: Record<Year, number>
  deathPercentDepartement: Record<Year, number>
  birthPerCapitaDepartementRanks: Record<Year, number>
  deathPerCapitaDepartementRanks: Record<Year, number>
}

export type DataNode<P extends DataPopulations> = {
  id: string
  name: string
  level: Level
  area?: number
  areaCountryRanks?: number
  population: P
}

export type Region = DataNode<DataPopulations> & {
  chefLieu: string
  departements: string[]
}

export type Departement = DataNode<DepartementPopulations> & {
  chefLieu: string
  region: string
  communes: string[]
  areaRegionRanks?: number
}

export type Commune = DataNode<CommunePopulations> & {
  departement: string
  zipCode?: string
  areaRegionRanks?: number
  areaDepartementRanks?: number
  /** Town hall position. */
  point?: Point
  /** Centre of the commune. */
  center?: Point
}
