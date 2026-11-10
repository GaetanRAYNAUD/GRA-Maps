import type { Places, ShapeLevel, Shapes } from '@gra-maps/shared'
import mapshaper from 'mapshaper'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import type { Data, Step } from '../model.ts'
import { sources } from '../sources/registry.ts'

/**
 * Share of the vertices kept by the simplification (Visvalingam, weighted, topology kept so
 * neighbours keep a common border). 10 % of the 100 m outlines reads cleanly from the whole of
 * France down to a departement, and keeps the two files around 300 kB and 140 kB of raw JSON.
 */
const KEEP = '10%'

type Feature = Shapes['features'][number] & { properties: { code: string; nom: string; region?: string } }

/**
 * Simplified outlines of the departements (Etalab 100 m, sources.shapes) and of the regions,
 * built as the union of their departements: both levels share exactly the same borders, which
 * the boundary tiles cannot guarantee (each level is simplified on its own there). Only the
 * departements of the COG are kept. Coordinates are rounded to 4 decimals (about 10 m).
 */
export const shapesStep: Step = {
  name: 'shapesStep',
  async run(data) {
    const source = JSON.parse(gunzipSync(await readFile(sources.shapes.file)).toString('utf8')) as Shapes
    const features = (source.features as Feature[]).filter((f) => data.departements.has(f.properties.code))
    const missing = [...data.departements.keys()].filter((id) => !features.some((f) => f.properties.code === id))
    if (missing.length) throw new Error(`[shapes] departements without outline: ${missing.join(', ')}`)

    const output = await mapshaper.applyCommands(
      [
        '-i departements.json',
        '-filter-fields code,nom,region',
        `-simplify ${KEEP} weighted keep-shapes`,
        '-o departements.json format=geojson precision=0.0001',
        '-dissolve2 region',
        '-o regions.json format=geojson precision=0.0001',
      ].join(' '),
      { 'departements.json': { type: 'FeatureCollection', features } },
    )
    const read = (name: string) => JSON.parse(String(output[name])) as Shapes

    const departements = read('departements.json')
    for (const f of departements.features as Feature[]) f.properties = { code: f.properties.code, nom: f.properties.nom }
    const regions = read('regions.json')
    for (const f of regions.features as Feature[]) {
      const code = f.properties.region ?? ''
      f.properties = { code, nom: data.regions.get(code)?.name ?? code }
    }
    data.shapes = { regions, departements } satisfies Record<ShapeLevel, Shapes>
    data.places = places(data)
    console.log(
      `[shapes] ${regions.features.length} regions, ${departements.features.length} departements, ${data.places.features.length} places`,
    )
  },
}

/** Communes named on the map: every chef-lieu, and the others from this population up. */
const PLACE_MIN_POPULATION = 5000

/** 4 decimals, about 10 m, like the outlines. */
const round = (value: number) => Math.round(value * 1e4) / 1e4

const latest = (series: Record<number, number> | undefined) => {
  const years = Object.keys(series ?? {}).map(Number)
  return years.length ? series![Math.max(...years)] : undefined
}

function places(data: Data): Places {
  const chefLieu = new Map<string, 1 | 2>()
  for (const d of data.departements.values()) chefLieu.set(d.chefLieu, 1)
  for (const r of data.regions.values()) chefLieu.set(r.chefLieu, 2)
  const features: Places['features'] = []
  for (const c of data.communes.values()) {
    const population = latest(c.population.population) ?? 0
    const rank = chefLieu.get(c.id) ?? 0
    if (!c.center || (rank === 0 && population < PLACE_MIN_POPULATION)) continue
    features.push({
      type: 'Feature',
      properties: { code: c.id, nom: c.name, population, chefLieu: rank },
      geometry: { type: 'Point', coordinates: [round(c.center.lon), round(c.center.lat)] },
    })
  }
  // Largest first: the map keeps the first label when two collide.
  features.sort((a, b) => b.properties.population - a.properties.population)
  return { type: 'FeatureCollection', features }
}
