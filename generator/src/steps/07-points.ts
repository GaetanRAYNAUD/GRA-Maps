import type { Point } from '@gra-maps/shared'
import { readFile } from 'node:fs/promises'
import type { Step } from '../model.ts'
import { sources } from '../sources/registry.ts'

type GeoPoint = { type: 'Point'; coordinates: [number, number] }
type GeoCommune = { code: string; nom: string; mairie?: GeoPoint; centre?: GeoPoint }

const toPoint = (p: GeoPoint | undefined): Point | undefined => (p ? { lat: p.coordinates[1], lon: p.coordinates[0] } : undefined)

/**
 * Town hall and centre of each commune from sources.points (geo.api.gouv.fr): JSON array of
 * `{ code, nom, mairie, centre }`, one entry per commune and municipal arrondissement, with
 * `mairie` and `centre` as GeoJSON points `[lon, lat]`. Sets `commune.point` from `mairie` and
 * `commune.center` from `centre`, both converted to `{ lat, lon }`. Codes not in the COG
 * (arrondissements, overseas collectivities) are ignored.
 */
export const pointsStep: Step = {
  name: 'pointsStep',
  async run(data) {
    const entries = JSON.parse(await readFile(sources.points.file, 'utf8')) as GeoCommune[]
    let count = 0
    for (const entry of entries) {
      const commune = data.communes.get(entry.code)
      if (!commune) continue
      commune.point = toPoint(entry.mairie)
      commune.center = toPoint(entry.centre)
      count++
    }
    const missing = data.communes.size - count
    console.log(`[points] ${count} communes${missing ? `, ${missing} without point` : ''}`)
  },
}
