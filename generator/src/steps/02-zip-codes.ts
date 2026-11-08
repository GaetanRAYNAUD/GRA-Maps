import type { Step } from '../model.ts'
import { readCsv } from '../read/csv.ts'
import { sources } from '../sources/registry.ts'

/**
 * Zip codes from La Poste (sources.zipCodes, dataset laposte-hexasmal): `;` separated,
 * ISO-8859-1 (despite the HTTP header saying UTF-8), header line starting with `#`:
 * `#Code_commune_INSEE;Nom_de_la_commune;Code_postal;Libellé_d_acheminement;Ligne_5`.
 * One line per (commune, zip code, Ligne_5): about 39,000 lines for 35,000 communes, so a
 * commune can have several zip codes; the smallest one is kept. Paris, Lyon and Marseille
 * only appear through their municipal arrondissements (751xx, 6938x, 132xx): the commune
 * gets the smallest zip code of its arrondissements.
 */
export const zipCodesStep: Step = {
  name: 'zipCodesStep',
  async run(data) {
    const rows = await readCsv(sources.zipCodes.file, {
      delimiter: ';',
      encoding: 'latin1',
      header: (names) => names.map((n) => n.replace(/^#/, '')),
    })

    const best = new Map<string, string>()
    for (const row of rows) {
      const code = row.Code_commune_INSEE
      const zip = row.Code_postal
      if (!code || !zip) continue
      const commune = data.communes.has(code) ? code : data.arrondissements.get(code)
      if (!commune) continue
      const current = best.get(commune)
      if (!current || zip < current) best.set(commune, zip)
    }

    for (const [code, zip] of best) data.communes.get(code)!.zipCode = zip
    const missing = data.communes.size - best.size
    console.log(`[zipCodes] ${best.size} communes with a zip code${missing ? `, ${missing} without` : ''}`)
  },
}
