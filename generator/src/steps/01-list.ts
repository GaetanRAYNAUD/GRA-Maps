import type { Step } from '../model.ts'

/**
 * Regions, departements and communes from the latest COG (sources.regions, departements,
 * communes): comma separated, quoted, UTF-8 CSV.
 * - v_region: REG, CHEFLIEU, TNCC, NCC, NCCENR, LIBELLE
 * - v_departement: DEP, REG, CHEFLIEU, TNCC, NCC, NCCENR, LIBELLE
 * - v_commune: TYPECOM, COM, REG, DEP, CTCD, ARR, TNCC, NCC, NCCENR, LIBELLE, CAN, COMPARENT;
 *   keep TYPECOM=COM only (COMA, COMD and ARM are associated, delegated communes and
 *   municipal arrondissements).
 * Skips DROM-COM: regions whose code starts with `0`, departements `97x`.
 * This COG is the reference geography for every year and every source; sources published in
 * an older geography are converted with v_mvt_commune (see docs/geography.md).
 */
export const listStep: Step = {
  name: 'listStep',
  run() {
    // TODO
  },
}
