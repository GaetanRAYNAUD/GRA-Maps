import type { Step } from '../model.ts'

/** sources.birth (Melodi DS_ETAT_CIVIL_NAIS_COMMUNES): zip with <id>_data.csv (FREQ;GEO;GEO_OBJECT;measure;[OBS_STATUS;]TIME_PERIOD;OBS_VALUE), keep GEO_OBJECT=COM. */
export const birthStep: Step = {
  name: 'birthStep',
  run() {
    // TODO
  },
}
