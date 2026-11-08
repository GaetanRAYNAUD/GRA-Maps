import { geoConverter } from '../geo.ts'
import type { Step } from '../model.ts'
import { melodiGeography, melodiValue, readMelodi } from '../read/melodi.ts'
import { sources } from '../sources/registry.ts'

/**
 * Areas in km² from sources.area (Melodi DS_RP_SERIE_HISTORIQUE): zip with `<id>_data.csv`,
 * `;` separated (GEO;GEO_OBJECT;FREQ;RP_MEASURE;OCS;OBS_STATUS;UNIT_MEASURE;TIME_PERIOD;OBS_VALUE).
 * Keep RP_MEASURE=SUP with GEO_OBJECT COM, DEP and REG: one row per territory, for the latest
 * census year. The file is large (about 180 MB unzipped, mostly other measures): it is
 * streamed and filtered on the fly. Commune codes go through the geography converter;
 * departement and region areas are taken as published.
 */
export const areaStep: Step = {
  name: 'areaStep',
  async run(data) {
    const file = sources.area.file
    const geo = await geoConverter(await melodiGeography(file), new Set(data.communes.keys()))

    await readMelodi(
      file,
      (row) => {
        const value = melodiValue(row)
        if (value === undefined) return
        if (row.GEO_OBJECT === 'COM') {
          const code = geo.toCurrent(row.GEO!)
          const commune = code ? data.communes.get(code) : undefined
          if (commune) commune.area = Math.round(((commune.area ?? 0) + value) * 100) / 100
        } else if (row.GEO_OBJECT === 'DEP') {
          const departement = data.departements.get(row.GEO!)
          if (departement) departement.area = value
        } else if (row.GEO_OBJECT === 'REG') {
          const region = data.regions.get(row.GEO!)
          if (region) region.area = value
        }
      },
      { prefilter: '"SUP"', keep: (row) => row.RP_MEASURE === 'SUP' },
    )

    const missing = [...data.communes.values()].filter((c) => c.area === undefined).length
    console.log(`[area] ${data.communes.size - missing} communes with an area${missing ? `, ${missing} without` : ''}`)
  },
}
