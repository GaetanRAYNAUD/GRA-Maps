import { describe, expect, it } from 'vitest'
import { jenksBreaks, jenksClassifier } from '../src/compute/jenks.ts'
import { floor1, percent, ranker } from '../src/compute/ranks.ts'

describe('ranker', () => {
  it('ranks the highest value first', () => {
    const rank = ranker([10, 30, 20])
    expect([30, 20, 10].map(rank)).toEqual([1, 2, 3])
  })

  it('gives tied values the last position of their tie', () => {
    const rank = ranker([5, 0, 0, 0, 9])
    expect(rank(9)).toBe(1)
    expect(rank(5)).toBe(2)
    expect(rank(0)).toBe(5)
  })
})

describe('floor1', () => {
  it('floors to one decimal', () => {
    expect(floor1(860, 15.95)).toBe(53.9)
    expect(floor1(8 * 1000, 860)).toBe(9.3)
  })

  it('does not lose exact ratios to float drift', () => {
    expect(floor1(123, 10)).toBe(12.3)
    expect(floor1(7, 0.7)).toBe(10)
  })
})

describe('percent', () => {
  it('rounds half up to 3 decimals', () => {
    expect(percent(1, 3)).toBe(33.333)
    expect(percent(2, 3)).toBe(66.667)
    expect(percent(5, 5)).toBe(100)
  })
})

describe('jenksClassifier', () => {
  it('uses at most 17 classes, in ascending order of values', () => {
    const values = Array.from({ length: 200 }, (_, i) => i * i)
    const classOf = jenksClassifier(values)
    const classes = values.map(classOf)
    expect(Math.max(...classes)).toBe(16)
    for (let i = 1; i < classes.length; i++) expect(classes[i]).toBeGreaterThanOrEqual(classes[i - 1]!)
  })

  it('keeps natural groups together', () => {
    const groups = [0, 1000, 2000].flatMap((base) => Array.from({ length: 20 }, (_, i) => base + i))
    const classOf = jenksClassifier(groups)
    expect(classOf(0)).toBeLessThan(classOf(1000))
    expect(classOf(1019)).toBeLessThan(classOf(2000))
  })

  it('never uses more classes than distinct values', () => {
    const classOf = jenksClassifier([0, 0, 0, 5, 5])
    expect(new Set([0, 5].map(classOf)).size).toBe(2)
    expect(Math.max(classOf(0), classOf(5))).toBe(1)
  })

  it('puts values above the last break in the last class', () => {
    const classOf = jenksClassifier([1, 2, 3])
    expect(classOf(50)).toBe(classOf(3))
  })
})

describe('jenksBreaks', () => {
  it('gives the minimum then the maximum of each class', () => {
    const groups = [0, 1000, 2000].flatMap((base) => Array.from({ length: 20 }, (_, i) => base + i))
    const { bounds, classOf } = jenksBreaks(groups)
    expect(bounds[0]).toBe(0)
    expect(bounds.at(-1)).toBe(2019)
    expect(bounds.length).toBe(classOf(2019) + 2)
    for (let i = 1; i < bounds.length; i++) expect(bounds[i]).toBeGreaterThan(bounds[i - 1]!)
    for (const v of groups) expect(v).toBeLessThanOrEqual(bounds[classOf(v) + 1]!)
  })

  it('has no bounds without values', () => {
    expect(jenksBreaks([]).bounds).toEqual([])
  })
})
