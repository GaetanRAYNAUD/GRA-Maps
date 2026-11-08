/** A file of generator/out/: its key (= its path, `/` separated) and the MD5 of its content. */
export type LocalFile = { key: string; md5: string }

export type PublishPlan = {
  /** Keys to upload first (new or changed), common.json excepted. */
  uploads: string[]
  /** Uploaded last, so it never lists files not yet published. Undefined when unchanged. */
  last?: string
  /** Remote keys no longer produced, deleted once the new common.json is online. */
  deletes: string[]
  unchanged: number
}

/**
 * What to send to the bucket. `remote` maps each key of the bucket to its ETag, which R2 sets
 * to the hex MD5 of the content for single-part uploads (the only kind this script makes).
 */
export function planPublish(local: readonly LocalFile[], remote: ReadonlyMap<string, string>, lastKey: string): PublishPlan {
  const changed = local.filter((f) => remote.get(f.key) !== f.md5).map((f) => f.key)
  const localKeys = new Set(local.map((f) => f.key))
  return {
    uploads: changed.filter((k) => k !== lastKey).sort(),
    last: changed.includes(lastKey) ? lastKey : undefined,
    deletes: [...remote.keys()].filter((k) => !localKeys.has(k)).sort(),
    unchanged: local.length - changed.length,
  }
}
