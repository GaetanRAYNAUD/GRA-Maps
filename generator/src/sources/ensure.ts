import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import type { Mode } from '../model.ts'
import { type Source, sources } from './registry.ts'

/** Side files written next to `file` by a download (`<file><suffix>`, e.g. `x.zip.catalog.json`). */
async function sideFiles(file: string): Promise<string[]> {
  const prefix = path.basename(file)
  const names = await readdir(path.dirname(file)).catch(() => [])
  return names.filter((n) => n.startsWith(prefix) && n !== prefix).map((n) => n.slice(prefix.length))
}

/** Downloads `src` to a temporary file, then renames it and its side files into place. */
async function download(src: Source & { fetch: NonNullable<Source['fetch']> }): Promise<void> {
  console.log(`[sources] ${src.id}: downloading`)
  await mkdir(path.dirname(src.file), { recursive: true })
  const tmp = `${src.file}.tmp`
  try {
    await src.fetch(tmp)
    // Side files first: if renaming the main file fails, the next run downloads both again.
    for (const suffix of await sideFiles(tmp)) await rename(`${tmp}${suffix}`, `${src.file}${suffix}`)
    await rename(tmp, src.file)
  } catch (e) {
    for (const suffix of await sideFiles(tmp)) await rm(`${tmp}${suffix}`, { force: true })
    await rm(tmp, { force: true })
    throw new Error(`[sources] ${src.id}: download failed`, { cause: e })
  }
}

/**
 * Makes sure every source file is present.
 * - partial: downloads only the missing files (delete a file to refresh it); when a file of a
 *   group is missing, the whole group is downloaded again, so its files share one vintage;
 * - full: downloads everything again.
 * Downloads go to a temporary file renamed at the end, so an interrupted run
 * never leaves a truncated source behind.
 */
export async function ensureSources(mode: Mode): Promise<void> {
  const all = Object.values(sources) as Source[]
  const staleGroups = new Set(all.filter((s) => s.group && !existsSync(s.file)).map((s) => s.group))
  const missing: Source[] = []

  for (const src of all) {
    const needed = mode === 'full' || !existsSync(src.file) || (src.group !== undefined && staleGroups.has(src.group))
    if (!needed) continue
    if (!src.fetch) {
      if (!existsSync(src.file)) missing.push(src)
      else console.warn(`[sources] ${src.id}: no download defined, keeping local file`)
      continue
    }
    await download({ ...src, fetch: src.fetch })
  }

  if (missing.length > 0) {
    const list = missing.map((s) => `  - ${s.id} (${s.origin}): ${s.file}`).join('\n')
    throw new Error(`Missing sources with no download defined:\n${list}`)
  }
}
