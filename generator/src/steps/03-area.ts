import type { Step } from '../model.ts'

/**
 * Areas in km² from sources.area (Melodi DS_RP_SERIE_HISTORIQUE): zip with `<id>_data.csv`,
 * `;` separated (GEO;GEO_OBJECT;FREQ;RP_MEASURE;OCS;OBS_STATUS;UNIT_MEASURE;TIME_PERIOD;OBS_VALUE).
 * Keep RP_MEASURE=SUP with GEO_OBJECT COM, DEP and REG: one row per territory, for the latest
 * census year. The file is large (about 180 MB unzipped, mostly other measures): stream it and
 * filter on the fly. Same geography as the COG (spatialTemporal of the catalog entry), Mayotte
 * excepted.
 */
export const areaStep: Step = {
  name: 'areaStep',
  run() {
    // TODO
  },
}
