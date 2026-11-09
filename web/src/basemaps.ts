/** Backgrounds under the wash: the quiet world map (basemapStyle.ts) or the IGN aerial photos. */

export type BasemapId = 'carte' | 'photo'

export type Basemap = {
  id: BasemapId
  label: string
  /** Opacity of the wash over this background: the background has to show through. */
  washOpacity: number
  layer?: {
    name: string
    style: string
    format: 'image/png' | 'image/jpeg'
    maxzoom: number
    /** Thumbnail tile [x, y] at zoom 7. */
    thumb: [number, number]
  }
}

export const basemaps: Basemap[] = [
  { id: 'carte', label: 'Carte', washOpacity: 1 },
  {
    id: 'photo',
    label: 'Photos aériennes',
    washOpacity: 0.55,
    layer: { name: 'ORTHOIMAGERY.ORTHOPHOTOS', style: 'normal', format: 'image/jpeg', maxzoom: 19, thumb: [64, 45] },
  },
]

export const defaultBasemap = basemaps[0]!

export const basemapById = (id: string | null): Basemap => basemaps.find((b) => b.id === id) ?? defaultBasemap

/** WMTS tile URL in the web mercator grid; MapLibre fills in {z}, {x} and {y}. */
export function tileUrl(
  layer: NonNullable<Basemap['layer']>,
  z: string | number = '{z}',
  x: string | number = '{x}',
  y: string | number = '{y}',
) {
  return (
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM' +
    `&LAYER=${layer.name}&STYLE=${layer.style}&FORMAT=${layer.format}&TILEMATRIX=${z}&TILECOL=${x}&TILEROW=${y}`
  )
}

/** One tile at zoom 7 over central France, as the switcher's thumbnail. */
export const thumbnailUrl = (layer: NonNullable<Basemap['layer']>) => tileUrl(layer, 7, layer.thumb[0], layer.thumb[1])
