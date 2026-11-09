/**
 * Object keys of the published data, relative to the data base URL
 * (generator/out/ locally, maps-data.gaetanraynaud.fr in production).
 * Shared by the generator (output layout), the publish script and the front.
 */
import type { Jenks } from './types.ts'

export const jenksKinds = ['area', 'population', 'density', 'birth', 'death', 'birth-per-capita', 'death-per-capita'] as const
export type JenksKind = (typeof jenksKinds)[number]

/** Property of {@link Jenks} published as `jenks/{kind}.json`. */
export const jenksKeys: Record<JenksKind, keyof Jenks> = {
  area: 'area',
  population: 'population',
  density: 'density',
  birth: 'birth',
  death: 'death',
  'birth-per-capita': 'birthPerCapita',
  'death-per-capita': 'deathPerCapita',
}

export const dataPaths = {
  common: () => 'common.json',
  region: (id: string) => `regions/${id}.json`,
  departement: (id: string) => `departements/${id}.json`,
  commune: (id: string) => `communes/${id}.json`,
  jenks: (kind: JenksKind) => `jenks/${kind}.json`,
  /** Simplified outlines (GeoJSON) drawn on the map for the regions and the departements. */
  shapes: (level: ShapeLevel) => `shapes/${level}.json`,
  /** Place names drawn over the map: the main communes (GeoJSON points). */
  places: () => 'shapes/places.json',
}

export const shapeLevels = ['regions', 'departements'] as const
export type ShapeLevel = (typeof shapeLevels)[number]
