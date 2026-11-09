import { useEffect, useRef } from 'react'
import { AttributionControl, Map as MapLibre, NavigationControl } from 'maplibre-gl'
import type { ExpressionSpecification, FilterSpecification, MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { workerReady } from './maplibre-worker.ts'
import { communesMinZoom, franceBounds, mapLevels } from './geo.ts'
import type { MapLevel } from './geo.ts'
import { ground, ink, prussian, seam, washExpression } from './palette.ts'

const source = 'admin'

export type Hover = { level: MapLevel; id: string; name: string; x: number; y: number }
export type Focus = { center: [number, number]; zoom: number; key: number }

type Props = {
  level: MapLevel
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

function buildStyle(): StyleSpecification {
  const layers: StyleSpecification['layers'] = [{ id: 'ground', type: 'background', paint: { 'background-color': ground } }]
  for (const { value: level } of mapLevels) {
    const common = { source, 'source-layer': level, filter: metropolitan[level], layout: { visibility: 'none' as const } }
    layers.push(
      { id: `fill-${level}`, type: 'fill', ...common, paint: { 'fill-color': washExpression as ExpressionSpecification } },
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
  // Parent boundaries drawn in fine ink, for orientation.
  for (const parent of ['regions', 'departements'] as const) {
    layers.push({
      id: `context-${parent}`,
      type: 'line',
      source,
      'source-layer': parent,
      filter: metropolitan[parent],
      layout: { visibility: 'none' },
      paint: { 'line-color': prussian, 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 10, 1.4] },
    })
  }
  for (const { value: level } of mapLevels) {
    const common = { source, 'source-layer': level, filter: metropolitan[level], layout: { visibility: 'none' as const } }
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
        paint: { 'line-color': prussian, 'line-width': 3, 'line-opacity': ['case', flag('selected'), 1, 0] },
      },
    )
  }
  return {
    version: 8,
    sources: {
      [source]: {
        type: 'vector',
        url: 'https://openmaptiles.geo.data.gouv.fr/data/decoupage-administratif.json',
        promoteId: 'code',
        attribution: 'Frontières © DINUM (data.gouv.fr) · Données INSEE',
      },
    },
    layers,
  }
}

const featureName = (feature: MapGeoJSONFeature): string => String(feature.properties['nom'] ?? feature.id ?? '')

export function MapView({ level, ids, classes, nb, selected, focus, inset, onHover, onSelect, onView }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | undefined>(undefined)
  const ready = useRef(false)
  const pending = useRef(new Set<() => void>())
  const viewEmitter = useRef<() => void>(() => {})
  const hovered = useRef<{ level: MapLevel; id: string } | undefined>(undefined)
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
      style: buildStyle(),
      bounds: franceBounds,
      fitBoundsOptions: {
        padding: { top: 24, right: 24 + inset.right, bottom: 24 + inset.bottom, left: 24 + inset.left },
      },
      minZoom: 3.5,
      maxZoom: 13,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
    })
    instance.touchZoomRotate.disableRotation()
    instance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    instance.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    instance.getCanvas().setAttribute('aria-label', 'Carte de France')
    map.current = instance

    const clearHover = () => {
      if (hovered.current) {
        instance.setFeatureState({ source, sourceLayer: hovered.current.level, id: hovered.current.id }, { hover: false })
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
          instance.setFeatureState({ source, sourceLayer: value, id }, { hover: true })
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

  // Class position of every territory, as feature state: recolouring needs no style change.
  useEffect(() => {
    if (!ids) return
    return whenReady((instance) => {
      for (const id of ids) {
        const cls = classes?.[id]
        instance.setFeatureState({ source, sourceLayer: level, id }, { t: cls === undefined ? null : nb === 0 ? 1 : cls / nb })
      }
    })
  }, [ids, classes, nb, level])

  useEffect(() => {
    if (!selected) return
    const target = { source, sourceLayer: selected.level, id: selected.id }
    const cancel = whenReady((instance) => instance.setFeatureState(target, { selected: true }))
    return () => {
      cancel()
      if (map.current && ready.current) map.current.setFeatureState(target, { selected: false })
    }
  }, [selected?.level, selected?.id])

  useEffect(() => {
    if (!focus) return
    return whenReady((instance) => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      instance.flyTo({
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
  const paddingApplied = useRef(false)
  useEffect(
    () =>
      whenReady((instance) => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        instance.easeTo({
          padding: { top: 0, left: 0, right: inset.right, bottom: inset.bottom },
          duration: paddingApplied.current && !reduce ? 320 : 0,
        })
        paddingApplied.current = true
      }),
    [inset.right, inset.bottom],
  )

  return <div ref={container} className="map" />
}
