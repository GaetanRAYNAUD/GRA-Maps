import { ckmeans } from 'simple-statistics'

/** Maximum number of classes, per level. */
export const JENKS_CLASSES = 17

/**
 * Natural breaks classifier: optimal 1D clustering (ckmeans, Wang & Song 2011), which minimizes
 * the within-class sum of squared deviations, the same objective as Jenks natural breaks.
 * Uses `min(JENKS_CLASSES, distinct values)` classes. Returns the class index (0-based, in
 * ascending order of values) of a value: the first class whose maximum is >= the value.
 */
export function jenksClassifier(values: readonly number[]): (value: number) => number {
  if (values.length === 0) return () => 0
  const distinct = new Set(values).size
  const classes = ckmeans([...values], Math.min(JENKS_CLASSES, distinct))
  const maxima = classes.map((c) => c[c.length - 1]!)
  return (value) => {
    const index = maxima.findIndex((max) => value <= max)
    return index < 0 ? maxima.length - 1 : index
  }
}
