import { describe, expect, it } from 'vitest'
import { planPublish } from './publish-plan.ts'

const local = [
  { key: 'common.json', md5: 'c2' },
  { key: 'communes/01001.json', md5: 'a1' },
  { key: 'communes/01002.json', md5: 'b2' },
  { key: 'regions/11.json', md5: 'r1' },
]

describe('planPublish', () => {
  it('uploads everything on an empty bucket, common.json last', () => {
    const plan = planPublish(local, new Map(), 'common.json')
    expect(plan.uploads).toEqual(['communes/01001.json', 'communes/01002.json', 'regions/11.json'])
    expect(plan.last).toBe('common.json')
    expect(plan.deletes).toEqual([])
  })

  it('only sends changed files and deletes the ones no longer produced', () => {
    const remote = new Map([
      ['common.json', 'c1'],
      ['communes/01001.json', 'a1'],
      ['communes/01002.json', 'b1'],
      ['regions/11.json', 'r1'],
      ['communes/99999.json', 'z1'],
    ])
    const plan = planPublish(local, remote, 'common.json')
    expect(plan.uploads).toEqual(['communes/01002.json'])
    expect(plan.last).toBe('common.json')
    expect(plan.deletes).toEqual(['communes/99999.json'])
    expect(plan.unchanged).toBe(2)
  })

  it('does nothing when the bucket is up to date', () => {
    const remote = new Map(local.map((f) => [f.key, f.md5]))
    expect(planPublish(local, remote, 'common.json')).toEqual({ uploads: [], last: undefined, deletes: [], unchanged: 4 })
  })
})
