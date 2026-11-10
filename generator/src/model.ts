import {
  type Commune,
  type CommunePopulations,
  type Departement,
  type Jenks,
  Level,
  type Places,
  type Region,
  type ShapeLevel,
  type Shapes,
} from '@gra-maps/shared'

/**
 * - partial: download only missing sources, write only output files that are
 *   missing or whose content changed;
 * - full: download every source again and rewrite every output file.
 */
export type Mode = 'partial' | 'full'

/**
 * Nodes as held in memory: every level carries all the population series (the ones a level
 * does not use stay empty and are left out of the output), so steps can treat them alike.
 */
export type RegionNode = Region & { population: CommunePopulations }
export type DepartementNode = Departement & { population: CommunePopulations }
export type CommuneNode = Commune

/** In-memory state shared by every pipeline step. */
export type Data = {
  regions: Map<string, RegionNode>
  departements: Map<string, DepartementNode>
  communes: Map<string, CommuneNode>
  /** Municipal arrondissement code (Paris, Lyon, Marseille) -> code of its commune. */
  arrondissements: Map<string, string>
  /** Totals published by INSEE for departements and regions, keyed by `totalKey`. */
  inseeTotals: Map<string, number>
  /** Jenks classes, computed by the last step. */
  jenks?: Jenks
  /** Simplified outlines of the regions and departements, computed by the shapes step. */
  shapes?: Record<ShapeLevel, Shapes>
  /** Communes named on the map, computed by the shapes step. */
  places?: Places
}

export const emptyData = (): Data => ({
  regions: new Map(),
  departements: new Map(),
  communes: new Map(),
  arrondissements: new Map(),
  inseeTotals: new Map(),
})

export type Step = {
  name: string
  run: (data: Data) => Promise<void> | void
}

/** Every population series, empty. Series a level does not use stay empty and are left out of the output. */
export const emptyPopulation = (): CommunePopulations => ({
  population: {},
  countryRanks: {},
  regionRanks: {},
  departementRanks: {},
  percentCountry: {},
  percentRegion: {},
  percentDepartement: {},
  density: {},
  densityCountryRanks: {},
  densityRegionRanks: {},
  densityDepartementRanks: {},
  birth: {},
  birthCountryRanks: {},
  birthRegionRanks: {},
  birthDepartementRanks: {},
  birthPercentCountry: {},
  birthPercentRegion: {},
  birthPercentDepartement: {},
  death: {},
  deathCountryRanks: {},
  deathRegionRanks: {},
  deathDepartementRanks: {},
  deathPercentCountry: {},
  deathPercentRegion: {},
  deathPercentDepartement: {},
  birthPerCapita: {},
  birthPerCapitaCountryRanks: {},
  birthPerCapitaRegionRanks: {},
  birthPerCapitaDepartementRanks: {},
  deathPerCapita: {},
  deathPerCapitaCountryRanks: {},
  deathPerCapitaRegionRanks: {},
  deathPerCapitaDepartementRanks: {},
})

export const newRegion = (id: string, name: string, chefLieu: string): RegionNode => ({
  id,
  name,
  level: Level.REGION,
  chefLieu,
  departements: [],
  population: emptyPopulation(),
})

export const newDepartement = (id: string, name: string, region: string, chefLieu: string): DepartementNode => ({
  id,
  name,
  level: Level.DEPARTEMENT,
  chefLieu,
  region,
  communes: [],
  population: emptyPopulation(),
})

export const newCommune = (id: string, name: string, departement: string): CommuneNode => ({
  id,
  name,
  level: Level.COMMUNE,
  departement,
  population: emptyPopulation(),
})

/** Adds `value` to `series[year]` (several source codes can feed the same commune). */
export function addTo(series: Record<number, number>, year: number, value: number): void {
  series[year] = (series[year] ?? 0) + value
}
