import { geoConverter } from '../geo.ts'
import type { Step } from '../model.ts'
import { melodiGeography, melodiValue, readMelodi } from '../read/melodi.ts'
import { sources } from '../sources/registry.ts'

/**
 * Areas in km² from sources.area (Melodi DS_RP_SERIE_HISTORIQUE): zip with `<id>_data.csv`,
 * `;` separated (GEO;GEO_OBJECT;FREQ;RP_MEASURE;OCS;OBS_STATUS;UNIT_MEASURE;TIME_PERIOD;OBS_VALUE).
 * Keep RP_MEASURE=SUP with GEO_OBJECT COM, DEP and REG, latest census year only (one year
 * today; if INSEE publishes several, older ones are ignored rather than added up). The file
 * is large (about 180 MB unzipped, mostly other measures): it is streamed and filtered on the
 * fly. Commune codes go through the geography converter;
 * departement and region areas are taken as published.
 */
export const areaStep: Step = {
  name: 'areaStep',
  async run(data) {
    const file = sources.area.file
    const geo = await geoConverter(await melodiGeography(file), new Set(data.communes.keys()))

    // Latest census year of each territory: `${GEO_OBJECT}:${GEO}` -> { year, value }.
    const latest = new Map<string, { year: number; value: number }>()
    await readMelodi(
      file,
      (row) => {
        const value = melodiValue(row)
        if (value === undefined) return
        const key = `${row.GEO_OBJECT}:${row.GEO}`
        const year = Number(row.TIME_PERIOD)
        const current = latest.get(key)
        if (!current || year > current.year) latest.set(key, { year, value })
      },
      { prefilter: '"SUP"', keep: (row) => row.RP_MEASURE === 'SUP' && ['COM', 'DEP', 'REG'].includes(row.GEO_OBJECT!) },
    )

    for (const [key, { value }] of latest) {
      const [level, id] = key.split(':') as [string, string]
      if (level === 'COM') {
        const code = geo.toCurrent(id)
        const commune = code ? data.communes.get(code) : undefined
        // Merged communes: their areas are added up.
        if (commune) commune.area = Math.round(((commune.area ?? 0) + value) * 100) / 100
      } else {
        const node = level === 'DEP' ? data.departements.get(id) : data.regions.get(id)
        if (node) node.area = value
      }
    }

    const missing = [...data.communes.values()].filter((c) => c.area === undefined).length
    console.log(`[area] ${data.communes.size - missing} communes with an area${missing ? `, ${missing} without` : ''}`)
  },
}
