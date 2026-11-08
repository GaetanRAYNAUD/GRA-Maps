import type { Step } from '../model.ts'

/**
 * Zip codes from La Poste (sources.zipCodes, dataset laposte-hexasmal): `;` separated,
 * ISO-8859-1 (despite the HTTP header saying UTF-8), header line starting with `#`:
 * `#Code_commune_INSEE;Nom_de_la_commune;Code_postal;Libellé_d_acheminement;Ligne_5`.
 * One line per (commune, zip code, Ligne_5): about 39,000 lines for 35,000 communes, so a
 * commune can have several zip codes. Paris, Lyon and Marseille only appear through their
 * municipal arrondissements (751xx, 6938x, 132xx).
 */
export const zipCodesStep: Step = {
  name: 'zipCodesStep',
  run() {
    // TODO
  },
}
