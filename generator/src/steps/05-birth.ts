import type { Step } from '../model.ts'
import { sources } from '../sources/registry.ts'
import { readCommuneSeries } from './commune-series.ts'

/**
 * Births per commune and year from sources.birth (Melodi DS_ETAT_CIVIL_NAIS_COMMUNES): zip with
 * `<id>_data.csv` (FREQ;GEO;GEO_OBJECT;EC_MEASURE;OBS_STATUS;TIME_PERIOD;OBS_VALUE), keep
 * GEO_OBJECT=COM and EC_MEASURE=LVB. Rows with status K (counted in another commune) have no
 * value and are skipped.
 */
export const birthStep: Step = {
  name: 'birthStep',
  async run(data) {
    const years = await readCommuneSeries(data, sources.birth.file, 'birth', 'EC_MEASURE', new Set(['LVB']))
    console.log(`[birth] ${years.size} years`)
  },
}
