import { useEffect, useId, useRef, useState } from 'react'
import type { Indicator } from './indicators.ts'
import { formatValue, indicators } from './indicators.ts'
import { IndicatorPicker } from './IndicatorPicker.tsx'
import { Icon } from './Icon.tsx'
import { useMediaQuery } from './useMediaQuery.ts'

type Props = {
  indicator: Indicator
  series: Record<number, number>
  /** Series of another indicator for the same territory, for the picker of the enlarged view. */
  seriesOf: (indicator: Indicator) => Record<number, number> | undefined
  year: number | undefined
  onYear: (year: number) => void
  /** Territory name, for the enlarged view. */
  place: string
  /** Shorter, for the phone half sheet. */
  compact?: boolean
}

type Point = { year: number; value: number }

const toPoints = (series: Record<number, number>): Point[] =>
  Object.entries(series)
    .map(([y, v]) => ({ year: Number(y), value: v }))
    .sort((a, b) => a.year - b.year)

/** Indicators with a history: area has a single value. */
const yearlyIndicators = indicators.filter((indicator) => indicator.yearly)

type Size = 'compact' | 'normal' | 'large' | 'phone'

/** Drawing box of each size. The large one has room for a value axis and every 10 years. */
const sizes: Record<
  Size,
  { width: number; height: number; pad: { top: number; right: number; bottom: number; left: number }; step: number }
> = {
  compact: { width: 360, height: 84, pad: { top: 12, right: 8, bottom: 22, left: 8 }, step: 50 },
  normal: { width: 360, height: 150, pad: { top: 12, right: 8, bottom: 22, left: 8 }, step: 50 },
  large: { width: 880, height: 420, pad: { top: 16, right: 16, bottom: 28, left: 72 }, step: 10 },
  /** The enlarged chart on a phone: as narrow as the screen, but taller and with its value axis. */
  phone: { width: 360, height: 300, pad: { top: 12, right: 10, bottom: 24, left: 58 }, step: 50 },
}

/** Values on a true time axis: census years sit at their date, so the gaps stay visible. */
export function HistoryChart({ indicator, series, seriesOf, year, onYear, place, compact = false }: Props) {
  const [hover, setHover] = useState<number | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const points = toPoints(series)
  if (points.length < 2) return null

  const first = points[0]!.year
  const last = points.at(-1)!.year
  const shownPoint = points.find((p) => p.year === (hover ?? year))

  return (
    <figure className="chart">
      <figcaption id={titleId} className="chart-caption">
        <span>
          {indicator.label}, {first}–{last}
        </span>
        {shownPoint ? (
          <span className="chart-readout">
            {shownPoint.year} : <strong>{formatValue(indicator, shownPoint.value)}</strong>
          </span>
        ) : null}
        <button type="button" className="chart-enlarge" onClick={() => setOpen(true)} aria-label="Agrandir le graphique" title="Agrandir">
          <Icon name="enlarge" />
        </button>
      </figcaption>
      <Plot
        size={compact ? 'compact' : 'normal'}
        indicator={indicator}
        points={points}
        shown={shownPoint}
        labelledBy={titleId}
        onHover={setHover}
        onYear={onYear}
      />
      {open ? (
        <ChartDialog initial={indicator} seriesOf={seriesOf} year={year} onYear={onYear} place={place} onClose={() => setOpen(false)} />
      ) : null}
    </figure>
  )
}

/**
 * The chart at full width, in a modal dialog: Escape, the close button or a click outside closes it.
 * It has its own indicator picker, to look through the territory's histories without changing
 * the map.
 */
function ChartDialog({
  initial,
  seriesOf,
  year,
  onYear,
  place,
  onClose,
}: Pick<Props, 'seriesOf' | 'year' | 'onYear' | 'place'> & { initial: Indicator; onClose: () => void }) {
  const [indicator, setIndicator] = useState(initial)
  const points = toPoints(seriesOf(indicator) ?? {})
  const dialog = useRef<HTMLDialogElement>(null)
  /** A press that starts in the box and ends on the backdrop is not a click outside. */
  const pressedOutside = useRef(false)
  const phone = useMediaQuery('(max-width: 767px)')
  const [hover, setHover] = useState<number | undefined>(undefined)
  const titleId = useId()
  const shownPoint = points.find((p) => p.year === (hover ?? year))

  useEffect(() => {
    const element = dialog.current
    // No close() on cleanup: its close event would arrive after a remount and shut the dialog.
    // Unmounting removes the element, which ends the modal state anyway.
    if (element && !element.open) element.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="chart-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog box fills the element: a press on the element itself is on the backdrop.
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) onClose()
      }}
    >
      <div className="chart-dialog-box">
        <header className="chart-dialog-head">
          <div>
            <h2 id={titleId} className="chart-dialog-title">
              {place}
            </h2>
            <p className="chart-dialog-sub">
              {points.length > 0 ? `${points[0]!.year}–${points.at(-1)!.year}` : 'Pas de donnée'}
              {indicator.unit ? ` · ${indicator.unit}` : ''}
            </p>
          </div>
          <IndicatorPicker value={indicator} onChange={setIndicator} options={yearlyIndicators} />
          <p className="chart-dialog-readout" aria-live="polite">
            {shownPoint ? (
              <>
                {shownPoint.year} : <strong>{formatValue(indicator, shownPoint.value)}</strong>
              </>
            ) : null}
          </p>
          <button type="button" className="icon-button chart-dialog-close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </header>
        {points.length < 2 ? (
          <p className="chart-dialog-empty">Pas d'historique pour cet indicateur.</p>
        ) : (
          <Plot
            size={phone ? 'phone' : 'large'}
            indicator={indicator}
            points={points}
            shown={shownPoint}
            labelledBy={titleId}
            onHover={setHover}
            onYear={onYear}
          />
        )}
      </div>
    </dialog>
  )
}

type PlotProps = {
  size: Size
  indicator: Indicator
  points: Point[]
  shown: Point | undefined
  labelledBy: string
  onHover: (year: number | undefined) => void
  onYear: (year: number) => void
}

function Plot({ size, indicator, points, shown, labelledBy, onHover, onYear }: PlotProps) {
  const { width, height, pad, step } = sizes[size]
  const large = size === 'large' || size === 'phone'
  const first = points[0]!.year
  const last = points.at(-1)!.year
  const values = points.map((p) => p.value)
  const ticks = large ? valueTicks(Math.min(0, ...values), Math.max(...values)) : []
  const max = Math.max(...values, ...ticks)
  const min = Math.min(0, ...values)
  const x = (y: number) => pad.left + ((y - first) / (last - first || 1)) * (width - pad.left - pad.right)
  const yOf = (v: number) => pad.top + (1 - (v - min) / (max - min || 1)) * (height - pad.top - pad.bottom)

  // Runs of points without a census gap: more than 12 years apart (1936 to 1954) breaks both
  // the line and the fill.
  const runs: Point[][] = []
  points.forEach((p, i) => {
    if (i === 0 || p.year - points[i - 1]!.year > 12) runs.push([])
    runs.at(-1)!.push(p)
  })
  const at = (p: Point) => `${x(p.year).toFixed(1)} ${yOf(p.value).toFixed(1)}`
  const d = runs.map((run) => `M${run.map(at).join('L')}`).join('')
  const area = runs
    .filter((run) => run.length > 1)
    .map((run) => `M${x(run[0]!.year)} ${yOf(min)}L${run.map(at).join('L')}L${x(run.at(-1)!.year)} ${yOf(min)}Z`)
    .join('')

  const marks = Array.from(
    { length: Math.floor(last / step) - Math.ceil(first / step) + 1 },
    (_, i) => (Math.ceil(first / step) + i) * step,
  )

  const nearest = (clientX: number, rect: DOMRect) => {
    // The plot area starts after the left padding, in screen pixels.
    const scale = rect.width / width
    const left = rect.left + pad.left * scale
    const right = rect.right - pad.right * scale
    const target = first + ((clientX - left) / (right - left)) * (last - first)
    return points.reduce((best, p) => (Math.abs(p.year - target) < Math.abs(best.year - target) ? p : best)).year
  }

  return (
    <svg
      className={`chart-plot chart-plot-${size}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={labelledBy}
      onPointerMove={(event) => onHover(nearest(event.clientX, event.currentTarget.getBoundingClientRect()))}
      onPointerLeave={() => onHover(undefined)}
      onClick={(event) => onYear(nearest(event.clientX, event.currentTarget.getBoundingClientRect()))}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={yOf(tick)} y2={yOf(tick)} />
          <text className="chart-tick" x={pad.left - 8} y={yOf(tick) + 4} textAnchor="end">
            {formatValue(indicator, tick)}
          </text>
        </g>
      ))}
      {marks.map((mark) => (
        <g key={mark}>
          <line
            className={mark % 50 !== 0 ? 'chart-grid chart-grid-minor' : 'chart-grid'}
            x1={x(mark)}
            x2={x(mark)}
            y1={pad.top}
            y2={height - pad.bottom}
          />
          <text className="chart-tick" x={x(mark)} y={height - (large ? 8 : 6)} textAnchor="middle">
            {mark}
          </text>
        </g>
      ))}
      <path className="chart-area" d={area} />
      <line className="chart-base" x1={pad.left} x2={width - pad.right} y1={yOf(min)} y2={yOf(min)} />
      <path className="chart-line" d={d} />
      {points.map((p) => (
        <circle key={p.year} className="chart-dot" cx={x(p.year)} cy={yOf(p.value)} r={large ? 2.4 : 1.6} />
      ))}
      {shown ? (
        <g>
          <line className="chart-cursor" x1={x(shown.year)} x2={x(shown.year)} y1={pad.top} y2={height - pad.bottom} />
          <circle className="chart-current" cx={x(shown.year)} cy={yOf(shown.value)} r={large ? 5 : 4} />
        </g>
      ) : null}
    </svg>
  )
}

/** About five round values from 0 (or the minimum) to just above the maximum. */
function valueTicks(min: number, max: number): number[] {
  if (max <= min) return []
  const raw = (max - min) / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude
  const ticks: number[] = []
  for (let t = Math.floor(min / step) * step; ; t += step) {
    ticks.push(Number(t.toPrecision(12)))
    if (t >= max) break
  }
  return ticks
}
