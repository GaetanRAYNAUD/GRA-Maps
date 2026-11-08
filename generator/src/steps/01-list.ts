import type { Step } from '../model.ts'
import { newCommune, newDepartement, newRegion } from '../model.ts'
import { readCsv } from '../read/csv.ts'
import { sources } from '../sources/registry.ts'

/**
 * Regions, departements and communes from the latest COG (sources.regions, departements,
 * communes): comma separated, quoted, UTF-8 CSV.
 * - v_region: REG, CHEFLIEU, TNCC, NCC, NCCENR, LIBELLE
 * - v_departement: DEP, REG, CHEFLIEU, TNCC, NCC, NCCENR, LIBELLE
 * - v_commune: TYPECOM, COM, REG, DEP, CTCD, ARR, TNCC, NCC, NCCENR, LIBELLE, CAN, COMPARENT;
 *   keep TYPECOM=COM (COMA, COMD are associated and delegated communes). ARM rows (municipal
 *   arrondissements of Paris, Lyon, Marseille) only feed `data.arrondissements`.
 * Skips DROM-COM: regions whose code starts with `0`, departements `97x`.
 * This COG is the reference geography for every year and every source; sources published in
 * an older geography are converted with v_mvt_commune (see docs/geography.md).
 */
export const listStep: Step = {
  name: 'listStep',
  async run(data) {
    const isOverseas = (code: string) => code.startsWith('97')
    // Ordinal order, independent of the runtime locale: keeps the output (and its hashes) stable.
    const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

    const regions = (await readCsv(sources.regions.file)).filter((r) => r.REG && !r.REG.startsWith('0'))
    for (const r of regions.map((r) => newRegion(r.REG!, r.LIBELLE!, r.CHEFLIEU!)).sort(byId)) data.regions.set(r.id, r)

    const departements = (await readCsv(sources.departements.file)).filter((d) => d.DEP && !isOverseas(d.DEP))
    for (const d of departements.map((d) => newDepartement(d.DEP!, d.LIBELLE!, d.REG!, d.CHEFLIEU!)).sort(byId))
      data.departements.set(d.id, d)

    const communes: ReturnType<typeof newCommune>[] = []
    for (const c of await readCsv(sources.communes.file)) {
      if (!c.COM || isOverseas(c.COM)) continue
      if (c.TYPECOM === 'COM') communes.push(newCommune(c.COM, c.LIBELLE!, c.DEP!))
      else if (c.TYPECOM === 'ARM' && c.COMPARENT) data.arrondissements.set(c.COM, c.COMPARENT)
    }
    for (const c of communes.sort(byId)) data.communes.set(c.id, c)

    for (const d of data.departements.values()) data.regions.get(d.region)?.departements.push(d.id)
    for (const c of data.communes.values()) data.departements.get(c.departement)?.communes.push(c.id)

    const orphans = [...data.communes.values()].filter((c) => !data.departements.has(c.departement))
    if (orphans.length > 0) console.warn(`[list] ${orphans.length} communes without a known departement`)
    console.log(`[list] ${data.regions.size} regions, ${data.departements.size} departements, ${data.communes.size} communes`)
  },
}
