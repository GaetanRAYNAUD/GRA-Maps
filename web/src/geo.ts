import { Level } from '@gra-maps/shared'

/** Layers of the data.gouv.fr boundary tiles, one per level, keyed by INSEE code. */
export const MapLevel = {
  regions: 'regions',
  departements: 'departements',
  communes: 'communes',
} as const
export type MapLevel = (typeof MapLevel)[keyof typeof MapLevel]

export const mapLevels: { value: MapLevel; label: string }[] = [
  { value: 'regions', label: 'Régions' },
  { value: 'departements', label: 'Départements' },
  { value: 'communes', label: 'Communes' },
]

export const mapLevelOf = (level: Level): MapLevel =>
  level === Level.REGION ? 'regions' : level === Level.DEPARTEMENT ? 'departements' : 'communes'

export const levelOf = (mapLevel: MapLevel): Level =>
  mapLevel === 'regions' ? Level.REGION : mapLevel === 'departements' ? Level.DEPARTEMENT : Level.COMMUNE

export const parseMapLevel = (value: string | null): MapLevel | undefined =>
  value === 'regions' || value === 'departements' || value === 'communes' ? value : undefined

/** Path segment of a selected territory: /region/11, /departement/88, /commune/88160. */
export const routeSegment: Record<Level, string> = {
  [Level.REGION]: 'region',
  [Level.DEPARTEMENT]: 'departement',
  [Level.COMMUNE]: 'commune',
}

export const levelFromSegment = (segment: string | undefined): Level | undefined =>
  segment === 'region' ? Level.REGION : segment === 'departement' ? Level.DEPARTEMENT : segment === 'commune' ? Level.COMMUNE : undefined

/** The commune tiles start at zoom 8. */
export const communesMinZoom = 8

/** Metropolitan France, Corsica included. */
export const franceBounds: [[number, number], [number, number]] = [
  [-5.3, 41.3],
  [9.7, 51.15],
]

/**
 * The address search returns arrondissement codes for Paris, Lyon and Marseille, the data
 * only knows the communes.
 */
export function communeOfCityCode(code: string): string {
  if (/^751\d\d$/.test(code)) return '75056'
  if (/^6938\d$/.test(code)) return '69123'
  if (/^132\d\d$/.test(code)) return '13055'
  return code
}
