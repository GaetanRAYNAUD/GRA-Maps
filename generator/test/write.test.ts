import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type Data, emptyData, type RegionNode } from '../src/model.ts'
import { writeOutput } from '../src/write.ts'

const region = (id: string, name: string) => ({ id, name }) as unknown as RegionNode

const dataWith = (...regions: RegionNode[]): Data => {
  const data = emptyData()
  for (const r of regions) data.regions.set(r.id, r)
  return data
}

let out: string
beforeEach(async () => {
  out = await mkdtemp(path.join(tmpdir(), 'gra-maps-write-'))
})
afterEach(async () => {
  await rm(out, { recursive: true, force: true })
})

const file = (key: string) => path.join(out, key)
const read = async (key: string) => JSON.parse(await readFile(file(key), 'utf8'))
const mtime = async (key: string) => (await stat(file(key))).mtimeMs

describe('writeOutput', () => {
  it('writes plain JSON and common.json', async () => {
    await writeOutput(dataWith(region('11', 'Île-de-France')), 'partial', out)
    expect(await read('regions/11.json')).toEqual({ id: '11', name: 'Île-de-France' })
    expect(await read('common.json')).toEqual({ regions: ['11'], departements: [], communes: [] })
  })

  it('partial mode rewrites only missing or changed files', async () => {
    await writeOutput(dataWith(region('11', 'A'), region('24', 'B')), 'partial', out)
    const before24 = await mtime('regions/24.json')
    await rm(file('regions/11.json'))
    await new Promise((r) => setTimeout(r, 20))

    await writeOutput(dataWith(region('11', 'A'), region('24', 'B')), 'partial', out)
    expect(existsSync(file('regions/11.json'))).toBe(true)
    expect(await mtime('regions/24.json')).toBe(before24)

    await writeOutput(dataWith(region('11', 'A'), region('24', 'C')), 'partial', out)
    expect((await read('regions/24.json')).name).toBe('C')
  })

  it('full mode rewrites every file', async () => {
    await writeOutput(dataWith(region('11', 'A')), 'partial', out)
    const before = await mtime('regions/11.json')
    await new Promise((r) => setTimeout(r, 20))
    await writeOutput(dataWith(region('11', 'A')), 'full', out)
    expect(await mtime('regions/11.json')).toBeGreaterThan(before)
  })

  it('deletes files no longer produced and leftovers, even without a manifest', async () => {
    await writeOutput(dataWith(region('11', 'A'), region('24', 'B')), 'partial', out)
    await rm(path.join(out, '.manifest.json'))
    await writeFile(file('regions/11.json') + '.tmp', 'partial write')

    await writeOutput(dataWith(region('11', 'A')), 'partial', out)
    expect(existsSync(file('regions/24.json'))).toBe(false)
    expect(existsSync(file('regions/11.json') + '.tmp')).toBe(false)
    expect(existsSync(file('regions/11.json'))).toBe(true)
  })
})
