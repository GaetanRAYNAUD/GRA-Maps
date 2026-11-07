import { mkdir, rename, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Mode } from '../model.ts'
import { sources, type Source } from './registry.ts'

/**
 * Makes sure every source file is present.
 * - partial: downloads only the missing files (delete a file to refresh it);
 * - full: downloads everything again.
 * Downloads go to a temporary file renamed at the end, so an interrupted run
 * never leaves a truncated source behind.
 */
export async function ensureSources(mode: Mode): Promise<void> {
  const missing: Source[] = []

  for (const src of Object.values(sources)) {
    if (mode === 'partial' && existsSync(src.file)) continue
    if (!src.fetch) {
      if (!existsSync(src.file)) missing.push(src)
      else console.warn(`[sources] ${src.id}: no download defined, keeping local file`)
      continue
    }
    console.log(`[sources] ${src.id}: downloading`)
    await mkdir(path.dirname(src.file), { recursive: true })
    const tmp = `${src.file}.tmp`
    try {
      await src.fetch(tmp)
      await rename(tmp, src.file)
    } catch (e) {
      await rm(tmp, { force: true })
      throw new Error(`[sources] ${src.id}: download failed`, { cause: e })
    }
  }

  if (missing.length > 0) {
    const list = missing.map((s) => `  - ${s.id} (${s.origin}): ${s.file}`).join('\n')
    throw new Error(`Missing sources with no download defined:\n${list}`)
  }
}
