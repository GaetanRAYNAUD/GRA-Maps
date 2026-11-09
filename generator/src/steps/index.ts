import type { Step } from '../model.ts'
import { listStep } from './01-list.ts'
import { zipCodesStep } from './02-zip-codes.ts'
import { areaStep } from './03-area.ts'
import { populationStep } from './04-population.ts'
import { birthStep } from './05-birth.ts'
import { deathStep } from './06-death.ts'
import { pointsStep } from './07-points.ts'
import { internStep } from './08-intern.ts'
import { shapesStep } from './09-shapes.ts'

/** Execution order: each step relies on the previous ones. */
export const steps: Step[] = [listStep, zipCodesStep, areaStep, populationStep, birthStep, deathStep, pointsStep, internStep, shapesStep]
