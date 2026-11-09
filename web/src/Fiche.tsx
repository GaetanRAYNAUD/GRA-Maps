import { useEffect, useState } from 'react'
import { Level } from '@gra-maps/shared'
import type { Commune, Departement, Region } from '@gra-maps/shared'
import { loadCommune, loadDepartement, loadRegion } from './data.ts'
import { HistoryChart } from './HistoryChart.tsx'
import { Icon } from './Icon.tsx'
import { useMediaQuery } from './useMediaQuery.ts'
import { formatNumber, formatValue, indicators, percentFor, rankFor, scopesFor, seriesFor, valueFor } from './indicators.ts'
import type { Indicator, Scope } from './indicators.ts'

export type Selection = { level: Level; id: string }

type Loaded = {
  node: Region | Departement | Commune
  departement?: Departement
  region?: Region
}

type Props = {
  selection: Selection
  countryCounts: Record<Level, number>
  /** Every commune id, to count the communes of a region. */
  communeIds: string[] | undefined
  indicator: Indicator
  year: number | undefined
  onIndicator: (indicator: Indicator) => void
  onYear: (year: number) => void
  onSelect: (selection: Selection) => void
  onClose: () => void
  /** Loaded node, for the map (class mark, camera). */
  onLoaded: (node: Region | Departement | Commune | undefined) => void
}

async function loadSelection(selection: Selection): Promise<Loaded> {
  if (selection.level === Level.REGION) return { node: await loadRegion(selection.id) }
  if (selection.level === Level.DEPARTEMENT) {
    const node = await loadDepartement(selection.id)
    return { node, region: await loadRegion(node.region) }
  }
  const node = await loadCommune(selection.id)
  const departement = await loadDepartement(node.departement)
  return { node, departement, region: await loadRegion(departement.region) }
}

const levelNames: Record<Level, string> = { REGION: 'Région', DEPARTEMENT: 'Département', COMMUNE: 'Commune' }

export function Fiche({ selection, countryCounts, communeIds, indicator, year, onIndicator, onYear, onSelect, onClose, onLoaded }: Props) {
  const [state, setState] = useState<{ key: string; loaded?: Loaded; error?: boolean }>({ key: '' })
  const [expanded, setExpanded] = useState(false)
  const key = `${selection.level}/${selection.id}`

  useEffect(() => {
    let live = true
    setState({ key })
    loadSelection(selection).then(
      (loaded) => {
        if (!live) return
        setState({ key, loaded })
        onLoaded(loaded.node)
      },
      () => {
        if (!live) return
        setState({ key, error: true })
        onLoaded(undefined)
      },
    )
    return () => {
      live = false
    }
  }, [key])

  const loaded = state.key === key ? state.loaded : undefined
  const error = state.key === key && state.error

  return (
    <aside className={`fiche${expanded ? ' is-expanded' : ''}`} aria-label="Fiche du territoire" aria-busy={!loaded && !error}>
      <div className="fiche-bar">
        <button
          type="button"
          className="fiche-grip"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Réduire la fiche' : 'Agrandir la fiche'}
        >
          <span aria-hidden="true" />
        </button>
        <button type="button" className="icon-button fiche-close" onClick={onClose} aria-label="Fermer la fiche">
          <Icon name="close" />
        </button>
      </div>
      {error ? (
        <div className="fiche-body">
          <p className="fiche-error">Impossible de charger ce territoire. Vérifiez la connexion, puis rouvrez-le depuis la carte.</p>
        </div>
      ) : !loaded ? (
        <div className="fiche-body" aria-hidden="true">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-big" />
        </div>
      ) : (
        <FicheBody
          loaded={loaded}
          countryCounts={countryCounts}
          communeIds={communeIds}
          indicator={indicator}
          year={year}
          onIndicator={onIndicator}
          onYear={onYear}
          onSelect={onSelect}
        />
      )}
    </aside>
  )
}

type BodyProps = Pick<Props, 'countryCounts' | 'communeIds' | 'indicator' | 'year' | 'onIndicator' | 'onYear' | 'onSelect'> & {
  loaded: Loaded
}

function FicheBody({ loaded, countryCounts, communeIds, indicator, year, onIndicator, onYear, onSelect }: BodyProps) {
  const phone = useMediaQuery('(max-width: 767px)')
  const { node, departement, region } = loaded
  const effectiveYear = year ?? latestYear(node.population.population)
  const value = valueFor(indicator, node, effectiveYear)
  const series = indicator.yearly ? seriesFor(indicator, node) : undefined
  const scopes = scopesFor(node.level)

  const scopeLabel: Record<Scope, string> = {
    country: 'France',
    region: region ? region.name : 'région',
    departement: departement ? departement.name : 'département',
  }
  const scopeCount: Partial<Record<Scope, number>> = {
    country: countryCounts[node.level] || undefined,
    region:
      node.level === Level.DEPARTEMENT
        ? region?.departements.length
        : node.level === Level.COMMUNE && region && communeIds
          ? countCommunes(communeIds, region.departements)
          : undefined,
    departement: departement?.communes.length,
  }

  return (
    <div className="fiche-body">
      <header className="fiche-head">
        <h2 className="fiche-name">{node.name}</h2>
        <p className="fiche-context">
          {levelNames[node.level]}
          {departement ? (
            <>
              {' · '}
              <button type="button" className="link" onClick={() => onSelect({ level: Level.DEPARTEMENT, id: departement.id })}>
                {departement.name} ({departement.id})
              </button>
            </>
          ) : null}
          {region ? (
            <>
              {' · '}
              <button type="button" className="link" onClick={() => onSelect({ level: Level.REGION, id: region.id })}>
                {region.name}
              </button>
            </>
          ) : null}
          {node.level === Level.REGION ? ` · ${(node as Region).departements.length} départements` : null}
          {node.level === Level.DEPARTEMENT ? ` · ${formatNumber((node as Departement).communes.length)} communes` : null}
          {'zipCode' in node && node.zipCode ? ` · ${node.zipCode}` : null}
        </p>
      </header>

      <div className="headline">
        {value === undefined ? (
          <p className="headline-missing">Pas de donnée {indicator.yearly ? `en ${effectiveYear}` : ''}</p>
        ) : (
          <>
            <p className="headline-value">
              {formatValue(indicator, value)}
              {indicator.unit === '‰' ? <span className="headline-unit"> ‰</span> : null}
            </p>
            <p className="headline-phrase">
              {indicator.phrase}
              {indicator.yearly ? ` en ${effectiveYear}` : ''}
            </p>
          </>
        )}
      </div>

      {series && phone ? <HistoryChart indicator={indicator} series={series} year={year} onYear={onYear} compact /> : null}

      <table className="ranks">
        <caption className="visually-hidden">
          Rang et part, {indicator.label.toLowerCase()} {indicator.yearly ? effectiveYear : ''}
        </caption>
        <thead>
          <tr>
            <td />
            <th scope="col">Rang</th>
            <th scope="col">{indicator.percents ? 'Part' : ''}</th>
          </tr>
        </thead>
        <tbody>
          {scopes.map((scope) => {
            const rank = rankFor(indicator, node, effectiveYear, scope)
            const percent = percentFor(indicator, node, effectiveYear, scope)
            const count = scopeCount[scope]
            return (
              <tr key={scope}>
                <th scope="row">{scopeLabel[scope]}</th>
                <td className="ranks-rank">
                  {rank === undefined ? (
                    '—'
                  ) : (
                    <>
                      {formatNumber(rank)}
                      <sup>{rank === 1 ? 're' : 'e'}</sup>
                      {count ? <span className="ranks-of"> / {formatNumber(count)}</span> : null}
                    </>
                  )}
                </td>
                <td className="ranks-share">{percent === undefined ? '' : formatPercent(percent)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {series && !phone ? <HistoryChart indicator={indicator} series={series} year={year} onYear={onYear} /> : null}

      <table className="others">
        <caption className="others-caption">Tous les indicateurs{indicator.yearly ? `, ${effectiveYear}` : ''}</caption>
        <tbody>
          {indicators.map((other) => {
            const otherValue = valueFor(other, node, effectiveYear)
            const current = other.slug === indicator.slug
            return (
              <tr key={other.slug} className={current ? 'is-current' : undefined}>
                <th scope="row">
                  <button type="button" className="others-pick" onClick={() => onIndicator(other)} aria-pressed={current}>
                    {other.label}
                  </button>
                </th>
                <td>
                  {otherValue === undefined ? '—' : formatValue(other, otherValue)}
                  {otherValue === undefined ? null : <span className="others-unit"> {other.unit}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="fiche-credit">Sources : INSEE. Frontières : DINUM (data.gouv.fr).</p>
    </div>
  )
}

function latestYear(series: Record<number, number> | undefined): number {
  return Math.max(0, ...Object.keys(series ?? {}).map(Number))
}

function formatPercent(percent: number): string {
  if (percent > 0 && percent < 0.1) return '< 0,1 %'
  return `${formatNumber(percent, 1)} %`
}

/** Commune codes start with their département code (2A, 2B, and three characters overseas). */
function countCommunes(communeIds: string[], departements: string[]): number {
  return communeIds.filter((id) => departements.some((d) => id.startsWith(d))).length
}
