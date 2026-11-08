import { describe, expect, it } from 'vitest'
import { bordersReport } from '../src/compute/check-borders.ts'
import { buildConverter, movesFrom, type Move } from '../src/geo.ts'

const row = (MOD: string, DATE_EFF: string, COM_AV: string, COM_AP: string, TYPECOM_AV = 'COM', TYPECOM_AP = 'COM') => ({
  MOD,
  DATE_EFF,
  COM_AV,
  COM_AP,
  TYPECOM_AV,
  TYPECOM_AP,
})

describe('movesFrom', () => {
  it('keeps mergers and code changes between communes, oldest first', () => {
    const moves = movesFrom([
      row('32', '2025-01-01', '01002', '01001'),
      row('10', '2024-01-01', '01003', '01003'), // name change
      row('32', '2024-01-01', '01004', '01004'), // chef-lieu keeps its code
      row('32', '2024-01-01', '01005', '01004', 'COMD'), // delegated commune
      row('41', '2023-01-01', '02001', '03001'),
    ])
    expect(moves).toEqual([
      { date: '2023-01-01', from: '02001', to: '03001' },
      { date: '2025-01-01', from: '01002', to: '01001' },
    ])
  })
})

describe('buildConverter', () => {
  const moves: Move[] = [
    { date: '2024-01-01', from: 'A', to: 'B' },
    { date: '2025-01-01', from: 'B', to: 'C' },
    { date: '2026-01-01', from: 'D', to: 'C' },
  ]
  const known = new Set(['C', 'E'])

  it('keeps current codes', () => {
    expect(buildConverter(moves, '2023-01-01', known).toCurrent('E')).toBe('E')
  })

  it('chains the changes made after the source date', () => {
    const geo = buildConverter(moves, '2023-01-01', known)
    expect(geo.toCurrent('A')).toBe('C')
    expect(geo.toCurrent('B')).toBe('C')
    expect(geo.toCurrent('D')).toBe('C')
  })

  it('ignores the changes already in force at the source date', () => {
    const geo = buildConverter(moves, '2024-01-01', new Set(['B', 'C']))
    expect(geo.toCurrent('A')).toBeUndefined()
    expect(geo.unknown).toEqual(new Set(['A']))
  })

  it('reports codes that map to no known commune', () => {
    const geo = buildConverter(moves, '2023-01-01', known)
    expect(geo.toCurrent('Z')).toBeUndefined()
    expect(geo.unknown).toEqual(new Set(['Z']))
  })
})

describe('bordersReport', () => {
  const moves: Move[] = [
    { date: '2025-01-01', from: 'A', to: 'B' },
    { date: '2026-01-01', from: 'C', to: 'D' },
    { date: '2026-01-01', from: 'E', to: 'D' },
  ]

  it('lists the changes made after the tiles', () => {
    expect(bordersReport(moves, '2025-04-17', new Set(['B', 'D']))).toEqual({ changed: ['D'], gone: ['C', 'E'] })
  })

  it('reports nothing when the tiles are up to date', () => {
    expect(bordersReport(moves, '2026-03-01', new Set(['B', 'D']))).toEqual({ changed: [], gone: [] })
  })
})
