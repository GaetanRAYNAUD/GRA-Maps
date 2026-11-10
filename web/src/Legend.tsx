import { useEffect, useId, useState } from 'react'
import { Icon } from './Icon.tsx'
import type { Indicator } from './indicators.ts'
import { formatValue } from './indicators.ts'
import { usePalette, washAt } from './palette.ts'

type Props = {
  indicator: Indicator
  levelLabel: string
  years: number[]
  year: number | undefined
  onYear: (year: number) => void
  /** Highest class index of the level. */
  nb: number
  /** Smallest value, then the largest value of each class, when published. */
  bounds: number[] | undefined
  /** Class of the hovered or selected territory, marked on the ramp. */
  markClass: number | undefined
  markLabel: string | undefined
  loading: boolean
  notice: string | undefined
  onNotice: (() => void) | undefined
  noticeAction: string | undefined
  /** Phones: only the title and the year, to leave the map room. */
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

const stepDelay = 650

export function Legend({
  indicator,
  levelLabel,
  years,
  year,
  onYear,
  nb,
  bounds,
  markClass,
  markLabel,
  loading,
  notice,
  onNotice,
  noticeAction,
  collapsed,
  onCollapse,
}: Props) {
  const { wash, noData } = usePalette()
  const [playing, setPlaying] = useState(false)
  const sliderId = useId()
  const index = year === undefined ? -1 : years.indexOf(year)

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      const next = years[index + 1]
      if (next === undefined) setPlaying(false)
      else onYear(next)
    }, stepDelay)
    return () => window.clearTimeout(timer)
  }, [playing, index, years, onYear])

  const togglePlay = () => {
    if (!playing && index === years.length - 1 && years[0] !== undefined) onYear(years[0])
    setPlaying(!playing)
  }

  const cells = Array.from({ length: nb + 1 }, (_, i) => i)
  // Bounds only make sense when they match the classes on screen.
  const known = bounds && bounds.length === nb + 2 ? bounds : undefined
  const format = (value: number) => formatValue(indicator, value)
  const range = (cls: number) => {
    const low = known?.[cls]
    const high = known?.[cls + 1]
    if (low === undefined || high === undefined) return undefined
    return low === high ? format(high) : `${format(low)} – ${format(high)}`
  }

  return (
    <section className={`legend${collapsed ? ' is-collapsed' : ''}`} aria-label="Légende">
      <div className="legend-head">
        <h2 className="legend-title">
          {indicator.label}
          <span className="legend-level"> · {levelLabel}</span>
        </h2>
        <span className="legend-unit">{indicator.unit === '‰' ? 'pour 1 000 habitants' : indicator.unit}</span>
        {indicator.yearly && year !== undefined ? <span className="legend-year">{year}</span> : null}
        <button
          type="button"
          className="legend-toggle"
          onClick={() => onCollapse(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Déplier la légende' : 'Replier la légende'}
        >
          <Icon name={collapsed ? 'expand' : 'chevron'} />
        </button>
      </div>

      <div className="ramp-wrap">
        <div className="ramp" aria-hidden="true">
          {cells.map((cls) => (
            <i
              key={cls}
              className={cls === markClass ? 'is-marked' : undefined}
              style={{ background: washAt(wash, nb === 0 ? 1 : cls / nb) }}
              title={range(cls)}
            />
          ))}
        </div>
        <div className="ramp-ends">
          <span>{known ? format(known[0]!) : 'Moins'}</span>
          {markLabel && markClass !== undefined ? (
            <span className="ramp-mark">
              {markLabel}
              {known ? <span className="ramp-range"> · {range(markClass)}</span> : null}
            </span>
          ) : null}
          <span>{known ? format(known.at(-1)!) : 'Plus'}</span>
        </div>
        <div className="ramp-foot">
          <span className="swatch" style={{ background: noData }} aria-hidden="true" />
          Sans donnée
        </div>
      </div>

      {indicator.yearly && years.length > 0 && year !== undefined ? (
        <div className="years">
          <button
            type="button"
            className="play"
            onClick={togglePlay}
            aria-pressed={playing}
            aria-label={playing ? 'Arrêter le défilement des années' : 'Faire défiler les années'}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <div className="slider">
            <label htmlFor={sliderId} className="visually-hidden">
              Année
            </label>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={years.length - 1}
              step={1}
              value={Math.max(index, 0)}
              aria-valuetext={String(year)}
              onChange={(event) => {
                const next = years[Number(event.target.value)]
                if (next !== undefined) onYear(next)
              }}
            />
            <div className="slider-ends" aria-hidden="true">
              <span>{years[0]}</span>
              <span>{years.at(-1)}</span>
            </div>
          </div>
          <output className="year" htmlFor={sliderId} aria-live="polite">
            {year}
          </output>
        </div>
      ) : (
        <p className="legend-static">Valeur unique, sans année</p>
      )}

      {loading ? <p className="legend-note">Chargement des classes…</p> : null}
      {notice ? (
        <p className="legend-note">
          {notice}
          {onNotice && noticeAction ? (
            <button type="button" className="link" onClick={onNotice}>
              {noticeAction}
            </button>
          ) : null}
        </p>
      ) : null}
      <p className="legend-credit">Données INSEE. Contours Etalab, DINUM. Fond © OpenStreetMap (OpenFreeMap), IGN.</p>
    </section>
  )
}
