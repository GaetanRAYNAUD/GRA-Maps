import type { Step } from '../model.ts'
import { sources } from '../sources/registry.ts'
import { readCommuneSeries } from './commune-series.ts'

/**
 * Deaths per commune and year from sources.death (Melodi DS_ETAT_CIVIL_DECES_COMMUNES): same
 * layout as births, keep GEO_OBJECT=COM and EC_MEASURE=DTH.
 */
export const deathStep: Step = {
  name: 'deathStep',
  async run(data) {
    const years = await readCommuneSeries(data, sources.death.file, 'death', 'EC_MEASURE', ['DTH'])
    console.log(`[death] ${years.size} years`)
  },
}
