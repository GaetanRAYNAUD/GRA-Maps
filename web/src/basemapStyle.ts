import type { ExpressionSpecification, FilterSpecification, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import { dataPaths } from '@gra-maps/shared'
import { dataUrl } from './data.ts'
import { ink, land, landLine, plate, sea, seaInk } from './palette.ts'

/**
 * Quiet world background from OpenFreeMap (OpenStreetMap data in the OpenMapTiles schema, free,
 * no key): land, sea and the neighbouring countries, no roads. France itself is covered by the
 * wash; its place names come from our own data (shapes/places.json) and are drawn over it.
 */
export const basemapSourceId = 'world'
const placesSourceId = 'places'

export const basemapSources: Record<string, SourceSpecification> = {
  [basemapSourceId]: {
    type: 'vector',
    url: 'https://tiles.openfreemap.org/planet',
    attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  [placesSourceId]: { type: 'geojson', data: dataUrl(dataPaths.places()) },
}

export const glyphs = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

const smallNeighbours = ['MC', 'AD', 'LU', 'LI', 'SM', 'VA', 'JE', 'GG', 'IM', 'GI']

const frenchName: ExpressionSpecification = ['coalesce', ['get', 'name:fr'], ['get', 'name']]

const halo = { 'text-halo-color': plate, 'text-halo-width': 1.2, 'text-halo-blur': 0.3 }

/**
 * Under the wash: sea, country borders and the cities of the OpenStreetMap tiles. The wash, drawn
 * next, hides the French ones, so only the neighbours' cities show, in grey; ours are drawn above.
 * The aerial photos cover these layers too.
 */
export const underLayers: LayerSpecification[] = [
  {
    id: 'world-water',
    type: 'fill',
    source: basemapSourceId,
    'source-layer': 'water',
    filter: ['!=', ['get', 'brunnel'], 'tunnel'],
    paint: { 'fill-color': sea },
  },
  {
    id: 'world-borders',
    type: 'line',
    source: basemapSourceId,
    'source-layer': 'boundary',
    filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1], ['!=', ['get', 'disputed'], 1]],
    layout: { 'line-join': 'round' },
    paint: { 'line-color': landLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 1.2] },
  },
  {
    id: 'world-cities',
    type: 'symbol',
    source: basemapSourceId,
    'source-layer': 'place',
    minzoom: 5,
    filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
    layout: {
      'text-field': frenchName,
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13],
      'symbol-sort-key': ['get', 'rank'],
    },
    paint: { 'text-color': seaInk, ...halo },
  },
]

/** Our place names by tier: [filter, first zoom, text size at zoom 5 and 10, font]. */
const tiers: [string, FilterSpecification, number, [number, number], string][] = [
  ['major', ['any', ['==', ['get', 'chefLieu'], 2], ['>=', ['get', 'population'], 200000]], 4, [13, 17], 'Noto Sans Regular'],
  ['prefectures', ['any', ['==', ['get', 'chefLieu'], 1], ['>=', ['get', 'population'], 50000]], 5.5, [11, 14], 'Noto Sans Regular'],
  ['towns', ['>=', ['get', 'population'], 20000], 7, [10.5, 13], 'Noto Sans Regular'],
  ['small', ['all'], 8.5, [10.5, 12], 'Noto Sans Regular'],
]

/** Over the wash and the borders: seas, neighbouring countries, then the French places. */
export const overLayers: LayerSpecification[] = [
  {
    id: 'label-seas',
    type: 'symbol',
    source: basemapSourceId,
    'source-layer': 'water_name',
    maxzoom: 9,
    filter: ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
    layout: { 'text-field': frenchName, 'text-font': ['Noto Sans Italic'], 'text-size': 13, 'text-letter-spacing': 0.06 },
    paint: { 'text-color': seaInk },
  },
  {
    id: 'label-countries',
    type: 'symbol',
    source: basemapSourceId,
    'source-layer': 'place',
    maxzoom: 9,
    // France is named by its cities; the small neighbours' names would sit on the wash.
    filter: ['all', ['==', ['get', 'class'], 'country'], ['!', ['in', ['get', 'iso_a2'], ['literal', ['FR', ...smallNeighbours]]]]],
    layout: {
      'text-field': frenchName,
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.18,
      'text-max-width': 8,
    },
    paint: { 'text-color': seaInk, ...halo },
  },
  // Smallest tier first: MapLibre places the topmost layer's labels first, the largest cities.
  ...tiers
    .slice()
    .reverse()
    .map(([name, filter, minzoom, [small, large], font]): LayerSpecification => ({
      id: `label-places-${name}`,
      type: 'symbol',
      source: placesSourceId,
      minzoom,
      filter,
      layout: {
        'text-field': ['get', 'nom'],
        'text-font': [font],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, small, 10, large],
        'symbol-sort-key': ['-', ['get', 'population']],
        'text-padding': 3,
        'text-max-width': 9,
      },
      paint: { 'text-color': ink, ...halo },
    })),
]

export const background = { id: 'ground', type: 'background', paint: { 'background-color': land } } satisfies LayerSpecification
