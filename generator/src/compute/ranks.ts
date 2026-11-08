/** Index of the first element >= value in an ascending array. */
function lowerBound(sorted: readonly number[], value: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (sorted[mid]! < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Rank function over `values`: 1 for the highest value, and tied values share the last
 * position of their tie (rank = number of values >= the value).
 */
export function ranker(values: readonly number[]): (value: number) => number {
  const sorted = [...values].sort((a, b) => a - b)
  return (value) => sorted.length - lowerBound(sorted, value)
}

/** `value` floored to one decimal, computed as `numerator / denominator` (avoids float drift on exact ratios). */
export const floor1 = (numerator: number, denominator: number) => Math.floor((numerator * 10) / denominator + 1e-9) / 10

/** Share of `value` in `total`, in percent, rounded half up to 3 decimals. */
export const percent = (value: number, total: number) => Math.round((value * 100_000) / total) / 1000
