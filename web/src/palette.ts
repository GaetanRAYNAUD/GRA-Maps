/** Carmine wash ramp, lightest class first. */
export const wash = ['#f7e6e8', '#efc9ce', '#e1a0aa', '#cd6f7f', '#b4425a', '#8c2440', '#5f1229'] as const

export const noData = '#e5e9ee'
export const ink = '#26231e'
export const prussian = '#1f3a5f'
export const seam = '#ffffff'
export const ground = '#f3f5f8'

/** Colour of a class position t in [0, 1]. */
export function washAt(t: number): string {
  const scaled = Math.min(Math.max(t, 0), 1) * (wash.length - 1)
  const low = Math.floor(scaled)
  const high = Math.min(low + 1, wash.length - 1)
  return mix(wash[low]!, wash[high]!, scaled - low)
}

function mix(a: string, b: string, t: number): string {
  const pa = parse(a)
  const pb = parse(b)
  const channel = (i: number) =>
    Math.round(pa[i]! + (pb[i]! - pa[i]!) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

function parse(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

/** MapLibre expression reading the class position from the feature state. */
export const washExpression = [
  'case',
  ['==', ['feature-state', 't'], null],
  noData,
  ['interpolate', ['linear'], ['feature-state', 't'], ...wash.flatMap((colour, i) => [i / (wash.length - 1), colour])],
]
