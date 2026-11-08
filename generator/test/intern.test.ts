import { describe, expect, it } from 'vitest'
import { checkTotals } from '../src/compute/check-totals.ts'
import { emptyData, newCommune, newDepartement, newRegion, type Data } from '../src/model.ts'
import { internStep } from '../src/steps/08-intern.ts'

/** Two departements in one region, three communes; population and births for 2020. */
function sample(): Data {
  const data = emptyData()
  const region = newRegion('84', 'Region', '69123')
  region.departements.push('01', '69')
  region.area = 100
  data.regions.set(region.id, region)

  for (const [id, area, communes] of [
    ['01', 60, ['01001', '01002']],
    ['69', 40, ['69001']],
  ] as const) {
    const d = newDepartement(id, `Dep ${id}`, '84', communes[0])
    d.area = area
    d.communes.push(...communes)
    data.departements.set(id, d)
  }

  for (const [id, dep, area, population, birth] of [
    ['01001', '01', 10, 100, 1],
    ['01002', '01', 50, 300, 0],
    ['69001', '69', 40, 600, 9],
  ] as const) {
    const c = newCommune(id, `Commune ${id}`, dep)
    c.area = area
    c.population.population[2020] = population
    c.population.birth[2020] = birth
    data.communes.set(id, c)
  }
  return data
}

describe('internStep', () => {
  const data = sample()
  internStep.run(data)
  const commune = (id: string) => data.communes.get(id)!.population
  const dep01 = data.departements.get('01')!
  const region = data.regions.get('84')!

  it('sums communes into departements and departements into regions', () => {
    expect(dep01.population.population[2020]).toBe(400)
    expect(dep01.population.birth[2020]).toBe(1)
    expect(region.population.population[2020]).toBe(1000)
  })

  it('computes density and per capita values, floored to 1 decimal', () => {
    expect(commune('01001').density[2020]).toBe(10)
    expect(commune('01002').density[2020]).toBe(6)
    expect(dep01.population.density[2020]).toBe(6.6)
    expect(commune('01001').birthPerCapita[2020]).toBe(10)
    expect(commune('01002').birthPerCapita[2020]).toBe(0)
    expect(commune('69001').birthPerCapita[2020]).toBe(15)
  })

  it('ranks within the country, the region and the departement', () => {
    expect(commune('69001').countryRanks[2020]).toBe(1)
    expect(commune('01001').countryRanks[2020]).toBe(3)
    expect(commune('01001').departementRanks[2020]).toBe(2)
    expect(commune('69001').departementRanks[2020]).toBe(1)
    expect(dep01.population.regionRanks[2020]).toBe(2)
  })

  it('computes shares of the parent totals', () => {
    expect(commune('01001').percentCountry[2020]).toBe(10)
    expect(commune('01001').percentDepartement[2020]).toBe(25)
    expect(dep01.population.percentRegion[2020]).toBe(40)
    expect(region.population.percentCountry[2020]).toBe(100)
  })

  it('ranks areas', () => {
    expect(data.communes.get('01002')!.areaCountryRanks).toBe(1)
    expect(data.communes.get('01001')!.areaDepartementRanks).toBe(2)
    expect(dep01.areaRegionRanks).toBe(1)
  })

  it('computes Jenks classes per indicator and year', () => {
    const jenks = data.jenks!
    expect(Object.keys(jenks.population)).toEqual(['2020'])
    expect(jenks.population[2020]!.communes!['69001']).toBeGreaterThan(jenks.population[2020]!.communes!['01001']!)
    expect(Object.keys(jenks.area.communes!).sort()).toEqual(['01001', '01002', '69001'])
  })
})

describe('checkTotals', () => {
  it('reports totals that differ from INSEE', () => {
    const data = sample()
    internStep.run(data)
    data.inseeTotals.set('population:DEP:01:2020', 400)
    data.inseeTotals.set('population:REG:84:2020', 999)
    const population = checkTotals(data).find((r) => r.series === 'population')!
    expect(population.compared).toBe(2)
    expect(population.mismatches).toEqual(['REG 84 2020: INSEE 999, generated 1000'])
  })
})
