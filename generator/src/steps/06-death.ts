import type { Step } from '../model.ts'

/** sources.death (Melodi DS_ETAT_CIVIL_DECES_COMMUNES): zip with <id>_data.csv (FREQ;GEO;GEO_OBJECT;measure;[OBS_STATUS;]TIME_PERIOD;OBS_VALUE), keep GEO_OBJECT=COM. */
export const deathStep: Step = {
  name: 'deathStep',
  run() {
    // TODO
  },
}
