import type { Common, Commune, DataJenksNode, Departement, JenksArea, JenksByYear, JenksKind, Region } from '@gra-maps/shared'
import { Level } from '@gra-maps/shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router'
import { BasemapPicker } from './BasemapPicker.tsx'
import { basemapById, defaultBasemap } from './basemaps.ts'
import { loadCommon, loadJenks } from './data.ts'
import type { Selection } from './Fiche.tsx'
import { Fiche } from './Fiche.tsx'
import type { MapLevel } from './geo.ts'
import { communesMinZoom, levelFromSegment, levelOf, mapLevelOf, mapLevels, parseMapLevel, routeSegment } from './geo.ts'
import { Icon } from './Icon.tsx'
import { IndicatorPicker } from './IndicatorPicker.tsx'
import type { Indicator } from './indicators.ts'
import { indicatorBySlug, indicators } from './indicators.ts'
import { Legend } from './Legend.tsx'
import type { Focus, Hover } from './MapView.tsx'
import { MapView } from './MapView.tsx'
import { Search } from './Search.tsx'
import { useTheme } from './theme.ts'
import { ThemeSwitch } from './ThemeSwitch.tsx'
import { useMediaQuery } from './useMediaQuery.ts'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/:segment/:id" element={<MapPage />} />
      <Route path="*" element={<MapPage />} />
    </Routes>
  )
}

type JenksFile = JenksArea | JenksByYear

const nbKey: Record<MapLevel, keyof Pick<DataJenksNode, 'nbRegions' | 'nbDepartements' | 'nbCommunes'>> = {
  regions: 'nbRegions',
  departements: 'nbDepartements',
  communes: 'nbCommunes',
}

const boundsKey: Record<MapLevel, keyof Pick<DataJenksNode, 'boundsRegions' | 'boundsDepartements' | 'boundsCommunes'>> = {
  regions: 'boundsRegions',
  departements: 'boundsDepartements',
  communes: 'boundsCommunes',
}

const defaultLevel: MapLevel = 'departements'

function nearestYear(years: number[], wanted: number | undefined): number | undefined {
  if (!years.length) return undefined
  if (wanted === undefined || Number.isNaN(wanted)) return years.at(-1)
  return years.reduce((best, y) => (Math.abs(y - wanted) < Math.abs(best - wanted) ? y : best))
}

function MapPage() {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const mobile = useMediaQuery('(max-width: 767px)')
  const theme = useTheme()

  const indicator = indicatorBySlug(search.get('indicateur'))
  const basemap = basemapById(search.get('fond'))
  const selectionLevel = levelFromSegment(params['segment'])
  const selection: Selection | undefined = selectionLevel && params['id'] ? { level: selectionLevel, id: params['id'] } : undefined
  const level = parseMapLevel(search.get('niveau')) ?? (selection ? mapLevelOf(selection.level) : defaultLevel)

  const [common, setCommon] = useState<Common | undefined>(undefined)
  const [jenks, setJenks] = useState<Partial<Record<JenksKind, JenksFile>>>({})
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState<Hover | undefined>(undefined)
  const [focus, setFocus] = useState<Focus | undefined>(undefined)
  const [view, setView] = useState<{ zoom: number; center: [number, number] }>({ zoom: 5, center: [2.4, 46.6] })
  const [selectedNode, setSelectedNode] = useState<Region | Departement | Commune | undefined>(undefined)
  const [flownTo, setFlownTo] = useState<string | undefined>(undefined)
  const [menuOpen, setMenuOpen] = useState(false)
  const [legendCollapsed, setLegendCollapsed] = useState(false)

  useEffect(() => {
    loadCommon().then(setCommon, () => setFailed(true))
  }, [])

  // Only the indicator on screen is loaded; the others come when chosen.
  useEffect(() => {
    if (jenks[indicator.kind]) return
    let live = true
    loadJenks(indicator.kind).then(
      (file) => live && setJenks((all) => ({ ...all, [indicator.kind]: file as JenksFile })),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [indicator.kind])

  const file = jenks[indicator.kind]
  const years = useMemo(
    () =>
      indicator.yearly && file
        ? Object.keys(file)
            .map(Number)
            .sort((a, b) => a - b)
        : [],
    [file, indicator.yearly],
  )
  const wantedYear = search.get('annee') === null ? undefined : Number(search.get('annee'))
  const year = indicator.yearly ? nearestYear(years, wantedYear) : wantedYear
  const node: DataJenksNode | undefined = !file
    ? undefined
    : indicator.yearly
      ? year === undefined
        ? undefined
        : (file as JenksByYear)[year]
      : (file as JenksArea)
  const classes = node?.[level]
  const nb = node?.[nbKey[level]] ?? 0
  const bounds = node?.[boundsKey[level]]

  const ids = common?.[level]
  const countryCounts = useMemo(
    () => ({
      [Level.REGION]: common?.regions.length ?? 0,
      [Level.DEPARTEMENT]: common?.departements.length ?? 0,
      [Level.COMMUNE]: common?.communes.length ?? 0,
    }),
    [common],
  )

  const update = useCallback(
    (changes: Record<string, string | undefined>) =>
      setSearch(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined) next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      ),
    [setSearch],
  )

  const setYear = useCallback((y: number) => update({ annee: String(y) }), [update])
  const setIndicator = (next: Indicator) => update({ indicateur: next === indicators[0] ? undefined : next.slug })
  const setLevel = (next: MapLevel) => {
    update({ niveau: next })
    // Commune boundaries only exist from a closer zoom: go there rather than show an empty map.
    if (next === 'communes' && view.zoom < communesMinZoom) setFocus({ center: view.center, zoom: communesMinZoom, key: Date.now() })
  }

  const select = (next: Selection | undefined, changeLevel = false) => {
    const query = new URLSearchParams(search)
    if (next && changeLevel) query.set('niveau', mapLevelOf(next.level))
    const qs = query.toString()
    navigate(`${next ? `/${routeSegment[next.level]}/${next.id}` : '/'}${qs ? `?${qs}` : ''}`)
  }

  const onLoaded = useCallback(
    (loaded: Region | Departement | Commune | undefined) => {
      setSelectedNode(loaded)
      document.title = loaded ? `${loaded.name} · Cartes de France` : 'Cartes de France'
      // A commune opened from a link: bring it into view once.
      if (loaded && 'center' in loaded && loaded.center && flownTo !== loaded.id) {
        setFlownTo(loaded.id)
        setFocus({ center: [loaded.center.lon, loaded.center.lat], zoom: 9.5, key: Date.now() })
      }
    },
    [flownTo],
  )

  useEffect(() => {
    if (!selection) {
      setSelectedNode(undefined)
      document.title = 'Cartes de France'
    }
  }, [selection?.id])

  const hoveredClass = hover && hover.level === level ? classes?.[hover.id] : undefined
  const selectedClass = selection && mapLevelOf(selection.level) === level ? classes?.[selection.id] : undefined
  const markClass = hover ? hoveredClass : selectedClass
  const markLabel = hover ? hover.name : selectedNode?.name

  const communesHidden = level === 'communes' && view.zoom < communesMinZoom
  const panelOpen = Boolean(selection)
  // Room taken by the legend plate and the fiche, so the camera frames France beside them.
  const wide = window.innerWidth >= 1100
  const inset = mobile
    ? { left: 0, right: 0, bottom: panelOpen ? Math.round(window.innerHeight * 0.52) : legendCollapsed ? 56 : 150 }
    : { left: wide ? 220 : 0, right: panelOpen ? 420 : 0, bottom: wide ? 60 : 210 }

  return (
    <div className={`app${panelOpen ? ' has-fiche' : ''}${mobile && legendCollapsed ? ' legend-folded' : ''}`}>
      <header className="band">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          Cartes de France
        </a>
        <Search
          onPlace={(place) => {
            setFlownTo(place.commune)
            setFocus({ center: place.center, zoom: place.zoom, key: Date.now() })
            const query = new URLSearchParams(search)
            query.set('niveau', 'communes')
            navigate(`/commune/${place.commune}?${query.toString()}`)
          }}
        />
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="map-controls"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {indicator.label}
          <span className="menu-toggle-level">{mapLevels.find((l) => l.value === level)?.label}</span>
          <Icon name={menuOpen ? 'expand' : 'chevron'} />
        </button>
        <div className={`controls${menuOpen ? ' is-open' : ''}`} id="map-controls">
          <div className="segmented" role="radiogroup" aria-label="Niveau">
            {mapLevels.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={option.value === level}
                className={option.value === level ? 'is-on' : undefined}
                onClick={() => {
                  setLevel(option.value)
                  setMenuOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <IndicatorPicker
            value={indicator}
            onChange={(next) => {
              setIndicator(next)
              setMenuOpen(false)
            }}
          />
          <ThemeSwitch />
        </div>
      </header>

      <main className="stage">
        <MapView
          level={level}
          basemap={basemap}
          theme={theme}
          ids={ids}
          classes={classes}
          nb={nb}
          selected={selection ? { level: mapLevelOf(selection.level), id: selection.id } : undefined}
          focus={focus}
          inset={inset}
          onHover={setHover}
          onSelect={(mapLevel, id) => select({ level: levelOf(mapLevel), id })}
          onView={setView}
        />

        <BasemapPicker value={basemap} onChange={(next) => update({ fond: next === defaultBasemap ? undefined : next.id })} />

        {hover && !mobile ? (
          <div className="tip" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
            {hover.name}
          </div>
        ) : null}

        <Legend
          indicator={indicator}
          levelLabel={mapLevels.find((l) => l.value === level)?.label ?? ''}
          years={years}
          year={year}
          onYear={setYear}
          nb={nb}
          bounds={bounds}
          markClass={markClass}
          markLabel={markClass === undefined ? undefined : markLabel}
          loading={!file && !failed}
          notice={
            failed
              ? 'Les données ne répondent pas. Rechargez la page dans un instant.'
              : communesHidden
                ? 'Les communes apparaissent en zoomant.'
                : undefined
          }
          noticeAction={communesHidden && !failed ? 'Zoomer ici' : undefined}
          collapsed={mobile && legendCollapsed}
          onCollapse={setLegendCollapsed}
          onNotice={communesHidden && !failed ? () => setFocus({ center: view.center, zoom: communesMinZoom, key: Date.now() }) : undefined}
        />

        {selection ? (
          <Fiche
            key={`${selection.level}/${selection.id}`}
            selection={selection}
            countryCounts={countryCounts}
            communeIds={common?.communes}
            indicator={indicator}
            year={year}
            onIndicator={setIndicator}
            onYear={setYear}
            onSelect={(next) => select(next, true)}
            onClose={() => select(undefined)}
            onLoaded={onLoaded}
          />
        ) : null}
      </main>
    </div>
  )
}
