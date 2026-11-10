import { useEffect, useRef } from 'react'
import { AttributionControl, Map as MapLibre } from 'maplibre-gl'
import type {
  ExpressionSpecification,
  FilterSpecification,
  FlyToOptions,
  IControl,
  MapGeoJSONFeature,
  StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { dataPaths } from '@gra-maps/shared'
import { basemaps, tileUrl } from './basemaps.ts'
import type { Basemap } from './basemaps.ts'
import { dataUrl } from './data.ts'
import { workerReady } from './maplibre-worker.ts'
import { communesMinZoom, franceBounds, mapLevels } from './geo.ts'
import type { MapLevel } from './geo.ts'
import { palettes, washExpression } from './palette.ts'
import type { Palette } from './palette.ts'
import type { Theme } from './theme.ts'
import { background, basemapSources, glyphs, overLayers, underLayers } from './basemapStyle.ts'

/** data.gouv.fr boundary tiles: the communes, and the departements around them. */
const tiles = 'admin'

/**
 * Regions and departements are drawn from our simplified outlines (shapes/*.json), the communes
 * from the tiles: the tiles keep 5 m detail at every zoom and simplify each level on its own,
 * which blurs the borders and offsets the region lines from the departement seams.
 */
const sourceOf = (level: MapLevel) => (level === 'communes' ? { source: tiles, 'source-layer': 'communes' } : { source: `shape-${level}` })

/** Feature state target of a territory. */
const target = (level: MapLevel, id: string) =>
  level === 'communes' ? { source: tiles, sourceLayer: 'communes', id } : { source: `shape-${level}`, id }

export type Hover = { level: MapLevel; id: string; name: string; x: number; y: number }
export type Focus = { center: [number, number]; zoom: number; key: number }

type Props = {
  level: MapLevel
  basemap: Basemap
  theme: Theme
  /** Every id of the level, so ids without a class are reset. */
  ids: string[] | undefined
  classes: Record<string, number> | undefined
  /** Highest class index. */
  nb: number
  selected: { level: MapLevel; id: string } | undefined
  focus: Focus | undefined
  /** Width covered on the right (desktop panel) or the bottom (mobile sheet). */
  inset: { left: number; right: number; bottom: number }
  onHover: (hover: Hover | undefined) => void
  onSelect: (level: MapLevel, id: string) => void
  onView: (view: { zoom: number; center: [number, number] }) => void
}

/** DROM-COM are not in the data. */
const metropolitan: Record<MapLevel, FilterSpecification> = {
  regions: ['!=', ['slice', ['get', 'code'], 0, 1], '0'],
  departements: ['!=', ['slice', ['get', 'code'], 0, 2], '97'],
  communes: ['!=', ['slice', ['get', 'code'], 0, 2], '97'],
}

const flag = (key: string): ExpressionSpecification => ['boolean', ['feature-state', key], false]

function buildStyle(palette: Palette): StyleSpecification {
  const { ink, sapin, seam } = palette
  const layers: StyleSpecification['layers'] = [background(palette), ...underLayers(palette)]
  const rasters: StyleSpecification['sources'] = {}
  for (const basemap of basemaps) {
    if (!basemap.layer) continue
    rasters[`basemap-${basemap.id}`] = {
      type: 'raster',
      tiles: [tileUrl(basemap.layer)],
      tileSize: 256,
      maxzoom: basemap.layer.maxzoom,
      attribution: '© IGN',
    }
    layers.push({
      id: `basemap-${basemap.id}`,
      type: 'raster',
      source: `basemap-${basemap.id}`,
      layout: { visibility: 'none' },
    })
  }
  for (const { value: level } of mapLevels) {
    const common = { ...sourceOf(level), filter: metropolitan[level], layout: { visibility: 'none' as const } }
    layers.push(
      { id: `fill-${level}`, type: 'fill', ...common, paint: { 'fill-color': washExpression(palette) as ExpressionSpecification } },
      {
        id: `seam-${level}`,
        type: 'line',
        ...common,
        paint: {
          'line-color': seam,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, level === 'communes' ? 0.3 : 0.8, 10, level === 'communes' ? 1 : 2],
        },
      },
    )
  }
  // Parent boundaries in ink over the child seams, for orientation. The region outlines are the
  // union of the departement shapes, so they sit exactly on the departement seams; around the
  // communes the departement tiles follow the commune tiles closely enough at those zooms.
  for (const parent of ['regions', 'departements'] as const) {
    layers.push({
      id: `context-${parent}`,
      type: 'line',
      ...(parent === 'regions' ? sourceOf('regions') : { source: tiles, 'source-layer': 'departements' }),
      filter: metropolitan[parent],
      layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': sapin,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.1, 8, 1.6, 12, 2.2],
      },
    })
  }
  for (const { value: level } of mapLevels) {
    const common = { ...sourceOf(level), filter: metropolitan[level], layout: { visibility: 'none' as const } }
    layers.push(
      {
        id: `hover-${level}`,
        type: 'line',
        ...common,
        paint: { 'line-color': ink, 'line-width': 1.5, 'line-opacity': ['case', flag('hover'), 1, 0] },
      },
      {
        id: `selected-${level}`,
        type: 'line',
        ...common,
        paint: { 'line-color': sapin, 'line-width': 3, 'line-opacity': ['case', flag('selected'), 1, 0] },
      },
    )
  }
  return {
    version: 8,
    sources: {
      [tiles]: {
        type: 'vector',
        url: 'https://openmaptiles.geo.data.gouv.fr/data/decoupage-administratif.json',
        promoteId: 'code',
        attribution: 'Contours © DINUM, Etalab · Données INSEE',
      },
      'shape-regions': { type: 'geojson', data: dataUrl(dataPaths.shapes('regions')), promoteId: 'code' },
      'shape-departements': { type: 'geojson', data: dataUrl(dataPaths.shapes('departements')), promoteId: 'code' },
      ...rasters,
      ...basemapSources,
    },
    glyphs,
    layers: [...layers, ...overLayers(palette)],
  }
}

/** Line icons matching Icon.tsx, for the buttons MapLibre renders outside React. */
const controlIcon = (path: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`

/** Zoom in, zoom out, and back to the whole of France, in one group. */
class CameraControl implements IControl {
  private container: HTMLDivElement | undefined
  private readonly recenter: () => void

  constructor(recenter: () => void) {
    this.recenter = recenter
  }

  onAdd(map: MapLibre): HTMLElement {
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group camera-control'
    const button = (label: string, path: string, action: () => void) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.title = label
      element.setAttribute('aria-label', label)
      element.innerHTML = controlIcon(path)
      element.addEventListener('click', action)
      container.append(element)
    }
    button('Zoomer', '<path d="M12 5v14M5 12h14" />', () => map.zoomIn())
    button('Dézoomer', '<path d="M5 12h14" />', () => map.zoomOut())
    button(
      'Voir toute la France',
      '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" /><circle cx="12" cy="12" r="2.5" />',
      this.recenter,
    )
    this.container = container
    return container
  }

  onRemove(): void {
    this.container?.remove()
  }
}

const featureName = (feature: MapGeoJSONFeature): string => String(feature.properties['nom'] ?? feature.id ?? '')

export function MapView({ level, basemap, theme, ids, classes, nb, selected, focus, inset, onHover, onSelect, onView }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | undefined>(undefined)
  const ready = useRef(false)
  const pending = useRef(new Set<() => void>())
  const viewEmitter = useRef<() => void>(() => {})
  const hovered = useRef<{ level: MapLevel; id: string } | undefined>(undefined)
  const insetRef = useRef(inset)
  insetRef.current = inset
  const callbacks = useRef({ onHover, onSelect, onView })
  callbacks.current = { onHover, onSelect, onView }

  // Created once; React state flows in through the effects below.
  useEffect(() => {
    const element = container.current
    if (!element) return
    let instance: MapLibre | undefined
    let cancelled = false
    workerReady.then(() => {
      if (!cancelled) instance = create(element)
    })
    return () => {
      cancelled = true
      ready.current = false
      instance?.remove()
      map.current = undefined
    }
  }, [])

  function create(element: HTMLDivElement): MapLibre {
    const instance = new MapLibre({
      container: element,
      style: buildStyle(palettes[theme]),
      bounds: franceBounds,
      fitBoundsOptions: { padding: fitPadding(inset) },
      minZoom: 3.5,
      maxZoom: 13,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
    })
    instance.touchZoomRotate.disableRotation()
    instance.addControl(
      new CameraControl(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        // The camera padding already keeps the fiche and the phone legend out of the frame.
        const padding = { ...fitPadding(insetRef.current), right: 24, bottom: 24 }
        instance.fitBounds(franceBounds, { padding, animate: !reduce, duration: 900 })
      }),
      'bottom-right',
    )
    instance.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    instance.getCanvas().setAttribute('aria-label', 'Carte de France')
    map.current = instance

    const clearHover = () => {
      if (hovered.current) {
        instance.setFeatureState(target(hovered.current.level, hovered.current.id), { hover: false })
        hovered.current = undefined
      }
    }

    for (const { value } of mapLevels) {
      instance.on('mousemove', `fill-${value}`, (event) => {
        const feature = event.features?.[0]
        if (!feature || feature.id === undefined) return
        const id = String(feature.id)
        if (hovered.current?.id !== id || hovered.current.level !== value) {
          clearHover()
          hovered.current = { level: value, id }
          instance.setFeatureState(target(value, id), { hover: true })
        }
        instance.getCanvas().style.cursor = 'pointer'
        callbacks.current.onHover({ level: value, id, name: featureName(feature), x: event.point.x, y: event.point.y })
      })
      instance.on('mouseleave', `fill-${value}`, () => {
        clearHover()
        instance.getCanvas().style.cursor = ''
        callbacks.current.onHover(undefined)
      })
      instance.on('click', `fill-${value}`, (event) => {
        const feature = event.features?.[0]
        if (feature?.id !== undefined) callbacks.current.onSelect(value, String(feature.id))
      })
    }
    const emitView = () => {
      const { lng, lat } = instance.getCenter()
      callbacks.current.onView({ zoom: instance.getZoom(), center: [lng, lat] })
    }
    instance.on('moveend', emitView)
    viewEmitter.current = emitView
    instance.on('load', () => {
      ready.current = true
      for (const run of pending.current) run()
      pending.current.clear()
    })
    return instance
  }

  /** Runs now when the style is loaded, or once it is. */
  const whenReady = (run: (instance: MapLibre) => void) => {
    if (ready.current && map.current) {
      run(map.current)
      return () => {}
    }
    const listener = () => {
      if (map.current) run(map.current)
    }
    pending.current.add(listener)
    return () => {
      pending.current.delete(listener)
    }
  }

  useEffect(
    () =>
      whenReady((instance) => {
        for (const { value } of mapLevels) {
          const visibility = value === level ? 'visible' : 'none'
          for (const prefix of ['fill', 'seam', 'hover', 'selected'])
            instance.setLayoutProperty(`${prefix}-${value}`, 'visibility', visibility)
        }
        instance.setLayoutProperty('context-regions', 'visibility', level === 'departements' ? 'visible' : 'none')
        instance.setLayoutProperty('context-departements', 'visibility', level === 'communes' ? 'visible' : 'none')
        viewEmitter.current()
      }),
    [level],
  )

  // Theme and background. The colours of the theme are copied from a style built for it; then one
  // raster layer is shown, and the wash lightened so it shows through.
  const styledTheme = useRef(theme)
  useEffect(
    () =>
      whenReady((instance) => {
        const palette = palettes[theme]
        if (styledTheme.current !== theme) {
          styledTheme.current = theme
          for (const layer of buildStyle(palette).layers) {
            if (!('paint' in layer) || !layer.paint) continue
            for (const [property, value] of Object.entries(layer.paint)) {
              if (property.endsWith('color')) instance.setPaintProperty(layer.id, property as 'fill-color', value)
            }
          }
        }
        for (const other of basemaps) {
          if (other.layer) instance.setLayoutProperty(`basemap-${other.id}`, 'visibility', other.id === basemap.id ? 'visible' : 'none')
        }
        for (const { value } of mapLevels) instance.setPaintProperty(`fill-${value}`, 'fill-opacity', basemap.washOpacity)
        // Sapin lines vanish on the photos: draw the parent borders in white there.
        const photo = Boolean(basemap.layer)
        for (const parent of ['regions', 'departements']) {
          instance.setPaintProperty(`context-${parent}`, 'line-color', photo ? '#ffffff' : palette.sapin)
          instance.setPaintProperty(`context-${parent}`, 'line-width', [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            photo ? 1.6 : 1.1,
            8,
            photo ? 2.2 : 1.6,
            12,
            photo ? 3 : 2.2,
          ])
        }
      }),
    [basemap.id, theme],
  )

  // Class position of every territory, as feature state: recolouring needs no style change.
  useEffect(() => {
    if (!ids) return
    return whenReady((instance) => {
      for (const id of ids) {
        const cls = classes?.[id]
        instance.setFeatureState(target(level, id), { t: cls === undefined ? null : nb === 0 ? 1 : cls / nb })
      }
    })
  }, [ids, classes, nb, level])

  useEffect(() => {
    if (!selected) return
    const feature = target(selected.level, selected.id)
    const cancel = whenReady((instance) => instance.setFeatureState(feature, { selected: true }))
    return () => {
      cancel()
      if (map.current && ready.current) map.current.setFeatureState(feature, { selected: false })
    }
  }, [selected?.level, selected?.id])

  /** Flight to a focus still under way, so a padding change retargets it instead of cancelling it. */
  const flight = useRef<FlyToOptions | undefined>(undefined)
  const fly = (instance: MapLibre, options: FlyToOptions) => {
    flight.current = options
    // Listening only after flyTo: flyTo first stops the previous move, which fires moveend.
    instance.flyTo(options)
    if (!instance.isMoving()) {
      flight.current = undefined
      return
    }
    // Ends when the flight lands or is interrupted (drag, another flight).
    instance.once('moveend', () => {
      if (flight.current === options) flight.current = undefined
    })
  }

  useEffect(() => {
    if (!focus) return
    return whenReady((instance) => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      fly(instance, {
        center: focus.center,
        zoom: Math.max(focus.zoom, level === 'communes' ? communesMinZoom : 0),
        padding: { right: inset.right, bottom: inset.bottom, top: 0, left: 0 },
        essential: false,
        animate: !reduce,
        duration: 1600,
      })
    })
  }, [focus?.key])

  // The fiche covers part of the map: slide the view so its centre stays in the visible part.
  // A search moves the camera and opens the fiche in two renders: an easeTo here would cancel
  // the flight, so the flight is resumed with the new padding instead.
  const paddingApplied = useRef(false)
  useEffect(
    () =>
      whenReady((instance) => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const padding = { top: 0, left: 0, right: inset.right, bottom: inset.bottom }
        if (flight.current) fly(instance, { ...flight.current, padding })
        else instance.easeTo({ padding, duration: paddingApplied.current && !reduce ? 320 : 0 })
        paddingApplied.current = true
      }),
    [inset.right, inset.bottom],
  )

  return <div ref={container} className="map" />
}

/** Room around France when it is framed whole, beside the legend and the fiche. */
function fitPadding(inset: Props['inset']) {
  return { top: 24, right: 24 + inset.right, bottom: 24 + inset.bottom, left: 24 + inset.left }
}
