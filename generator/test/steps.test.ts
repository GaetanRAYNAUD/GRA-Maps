import { describe, expect, it } from 'vitest'
import { steps } from '../src/steps/index.ts'

describe('pipeline', () => {
  it('runs the steps in order', () => {
    expect(steps.map((s) => s.name)).toEqual([
      'listStep',
      'zipCodesStep',
      'areaStep',
      'populationStep',
      'birthStep',
      'deathStep',
      'pointsStep',
      'internStep',
      'shapesStep',
    ])
  })
})
