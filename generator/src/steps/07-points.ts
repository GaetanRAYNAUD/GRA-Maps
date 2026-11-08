import type { Step } from '../model.ts'

/**
 * Town hall and centre of each commune from sources.points (geo.api.gouv.fr): JSON array of
 * `{ code, nom, mairie, centre }`, one entry per commune and municipal arrondissement, with
 * `mairie` and `centre` as GeoJSON points `[lon, lat]`. Set `commune.point` from `mairie` and
 * `commune.center` from `centre`, both converted to `{ lat, lon }`. Codes not in the COG
 * (arrondissements, overseas collectivities) are ignored.
 */
export const pointsStep: Step = {
  name: 'pointsStep',
  run() {
    // TODO
  },
}
