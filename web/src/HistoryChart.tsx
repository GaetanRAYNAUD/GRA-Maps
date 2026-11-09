import { useId, useState } from 'react'
import type { Indicator } from './indicators.ts'
import { formatValue } from './indicators.ts'

type Props = {
  indicator: Indicator
  series: Record<number, number>
  year: number | undefined
  onYear: (year: number) => void
  /** Shorter, for the phone half sheet. */
  compact?: boolean
}

const width = 360
const pad = { top: 12, right: 8, bottom: 22, left: 8 }

/** Values on a true time axis: census years sit at their date, so the gaps stay visible. */
export function HistoryChart({ indicator, series, year, onYear, compact = false }: Props) {
  const height = compact ? 84 : 150
  const [hover, setHover] = useState<number | undefined>(undefined)
  const titleId = useId()
  const points = Object.entries(series)
    .map(([y, v]) => ({ year: Number(y), value: v }))
    .sort((a, b) => a.year - b.year)
  if (points.length < 2) return null

  const first = points[0]!.year
  const last = points.at(-1)!.year
  const values = points.map((p) => p.value)
  const max = Math.max(...values)
  const min = Math.min(0, ...values)
  const x = (y: number) => pad.left + ((y - first) / (last - first || 1)) * (width - pad.left - pad.right)
  const yOf = (v: number) => pad.top + (1 - (v - min) / (max - min || 1)) * (height - pad.top - pad.bottom)

  // Runs of points without a census gap: more than 12 years apart (1936 to 1954) breaks both
  // the line and the fill.
  const runs: (typeof points)[] = []
  points.forEach((p, i) => {
    if (i === 0 || p.year - points[i - 1]!.year > 12) runs.push([])
    runs.at(-1)!.push(p)
  })
  const at = (p: { year: number; value: number }) => `${x(p.year).toFixed(1)} ${yOf(p.value).toFixed(1)}`
  const d = runs.map((run) => `M${run.map(at).join('L')}`).join('')
  const area = runs
    .filter((run) => run.length > 1)
    .map((run) => `M${x(run[0]!.year)} ${yOf(min)}L${run.map(at).join('L')}L${x(run.at(-1)!.year)} ${yOf(min)}Z`)
    .join('')

  const shown = hover ?? year
  const shownPoint = points.find((p) => p.year === shown)
  const decades = Array.from({ length: Math.floor(last / 50) - Math.ceil(first / 50) + 1 }, (_, i) => (Math.ceil(first / 50) + i) * 50)

  const nearest = (clientX: number, rect: DOMRect) => {
    const target = first + ((clientX - rect.left) / rect.width) * (last - first)
    return points.reduce((best, p) => (Math.abs(p.year - target) < Math.abs(best.year - target) ? p : best)).year
  }

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
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        onPointerMove={(event) => setHover(nearest(event.clientX, event.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setHover(undefined)}
        onClick={(event) => onYear(nearest(event.clientX, event.currentTarget.getBoundingClientRect()))}
      >
        {decades.map((decade) => (
          <g key={decade}>
            <line className="chart-grid" x1={x(decade)} x2={x(decade)} y1={pad.top} y2={height - pad.bottom} />
            <text className="chart-tick" x={x(decade)} y={height - 6} textAnchor="middle">
              {decade}
            </text>
          </g>
        ))}
        <path className="chart-area" d={area} />
        <line className="chart-base" x1={pad.left} x2={width - pad.right} y1={yOf(min)} y2={yOf(min)} />
        <path className="chart-line" d={d} />
        {points.map((p) => (
          <circle key={p.year} className="chart-dot" cx={x(p.year)} cy={yOf(p.value)} r={1.6} />
        ))}
        {shownPoint ? (
          <g>
            <line className="chart-cursor" x1={x(shownPoint.year)} x2={x(shownPoint.year)} y1={pad.top} y2={height - pad.bottom} />
            <circle className="chart-current" cx={x(shownPoint.year)} cy={yOf(shownPoint.value)} r={4} />
          </g>
        ) : null}
      </svg>
    </figure>
  )
}
