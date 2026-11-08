import { download } from './download.ts'

/**
 * geo.api.gouv.fr (public, no key): https://geo.api.gouv.fr/communes
 * Every current commune and municipal arrondissement in a single request, with the
 * town hall point (`mairie`) and the commune centre (`centre`), both GeoJSON points
 * `[lon, lat]` rounded to 4 decimals (about 10 m).
 */
const COMMUNES_URL =
  'https://geo.api.gouv.fr/communes?fields=code,nom,mairie,centre&format=json&type=commune-actuelle,arrondissement-municipal'

export const geoApiCommunes = () => (dest: string) => download(COMMUNES_URL, dest)
