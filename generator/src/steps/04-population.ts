import type { Step } from '../model.ts'

/**
 * Population per commune and year, merged from two sources:
 *
 * - sources.population (Melodi DS_POPULATIONS_HISTORIQUES, 1968 onwards): zip with
 *   `<id>_data.csv` (FREQ;GEO;GEO_OBJECT;POPREF_MEASURE;TIME_PERIOD;OBS_VALUE), keep GEO_OBJECT=COM.
 * - sources.populationHistory (insee.fr page 3698339, 1876 onwards): xlsx, sheet `pop_1876_2023`,
 *   5 title rows then a label row and a code row (CODGEO, REG, DEP, LIBGEO, then one column per
 *   year: PMUNyyyy since 2006, PSDCyyyy 1962-1999, PTOTyyyy 1876-1954). Paris by arrondissement,
 *   Lyon and Marseille as whole communes. Read with `read-excel-file/node`.
 *
 * Melodi wins for every year it provides (1968-1999 as PSDC, 2006 onwards as PMUN); the xlsx
 * only fills the years Melodi lacks (1876-1962). Before 2006 the concept differs (population
 * sans double compte, then population totale). The xlsx has no row for Paris as a whole
 * (75056): sum its arrondissements for those years.
 * Both files are in an older geography than the COG (2025 for COG 2026): convert their codes
 * with v_mvt_commune before merging (see docs/geography.md).
 */
export const populationStep: Step = {
  name: 'populationStep',
  run() {
    // TODO
  },
}
