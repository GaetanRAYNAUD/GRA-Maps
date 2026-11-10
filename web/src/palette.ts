import type { Theme } from './theme.ts'
import { useTheme } from './theme.ts'

export type Palette = {
  /** Wash ramp, lowest class first. */
  wash: readonly string[]
  noData: string
  ink: string
  /** Shell colour (band, controls, selection): sapin green, the complement of the carmine wash. */
  sapin: string
  /** Paper seams between territories. */
  seam: string
  /** Halo behind the map labels. */
  plate: string
  /** World background: neutral land, cool sea, grey country borders and names. */
  land: string
  sea: string
  landLine: string
  seaInk: string
}

const light: Palette = {
  // Carmine wash, lightest class first: darker means more.
  wash: ['#f7e6e8', '#efc9ce', '#e1a0aa', '#cd6f7f', '#b4425a', '#8c2440', '#5f1229'],
  noData: '#e5e9ee',
  ink: '#26231e',
  sapin: '#1f4a3d',
  seam: '#ffffff',
  plate: '#ffffff',
  land: '#eceef1',
  sea: '#d6e1ec',
  landLine: '#a9b2bd',
  seaInk: '#6c7f94',
}

/**
 * On a dark ground the wash glows instead: the lowest class is a deep wine barely off the ground,
 * the highest a bright carmine. Brighter means more, which the legend shows.
 */
const dark: Palette = {
  wash: ['#3a2329', '#552630', '#742a3b', '#953148', '#b53f59', '#d45a72', '#ef8a9e'],
  noData: '#2b3036',
  ink: '#e9e6e0',
  sapin: '#8cc4ad',
  seam: '#14181c',
  plate: '#14181c',
  land: '#1d2126',
  sea: '#121a23',
  landLine: '#4d5763',
  seaInk: '#8394a7',
}

export const palettes: Record<Theme, Palette> = { light, dark }

export const usePalette = (): Palette => palettes[useTheme()]

/** Colour of a class position t in [0, 1]. */
export function washAt(wash: readonly string[], t: number): string {
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
export const washExpression = (palette: Palette) => [
  'case',
  ['==', ['feature-state', 't'], null],
  palette.noData,
  ['interpolate', ['linear'], ['feature-state', 't'], ...palette.wash.flatMap((colour, i) => [i / (palette.wash.length - 1), colour])],
]
