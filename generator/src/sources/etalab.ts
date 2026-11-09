import { download } from './download.ts'

/**
 * Etalab administrative boundaries (public, no key), built from the IGN Admin Express data:
 * https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/ has one folder per year and
 * `latest/`. Each level comes in four precisions (5m, 50m, 100m, 1000m), gzipped GeoJSON with
 * `code`, `nom` and the parent codes as properties.
 */
const BASE_URL = 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson'

export const etalabContours = (name: string) => (dest: string) => download(`${BASE_URL}/${name}.geojson.gz`, dest)
