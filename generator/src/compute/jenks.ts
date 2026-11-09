import { ckmeans } from 'simple-statistics'

/** Maximum number of classes, per level. */
export const JENKS_CLASSES = 17

export type JenksBreaks = {
  /** Class index (0-based, in ascending order of values) of a value. */
  classOf: (value: number) => number
  /** Smallest value, then the largest value of each class: `classes + 1` ascending numbers. */
  bounds: number[]
}

/**
 * Natural breaks: optimal 1D clustering (ckmeans, Wang & Song 2011), which minimizes the
 * within-class sum of squared deviations, the same objective as Jenks natural breaks.
 * Uses `min(JENKS_CLASSES, distinct values)` classes. A value belongs to the first class whose
 * maximum is >= the value.
 */
export function jenksBreaks(values: readonly number[]): JenksBreaks {
  if (values.length === 0) return { classOf: () => 0, bounds: [] }
  const distinct = new Set(values).size
  const classes = ckmeans([...values], Math.min(JENKS_CLASSES, distinct))
  const maxima = classes.map((c) => c[c.length - 1]!)
  return {
    classOf: (value) => {
      const index = maxima.findIndex((max) => value <= max)
      return index < 0 ? maxima.length - 1 : index
    },
    bounds: [classes[0]![0]!, ...maxima],
  }
}

export function jenksClassifier(values: readonly number[]): (value: number) => number {
  return jenksBreaks(values).classOf
}
