import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import pLimit from 'p-limit'
import { dataPaths, type Common } from '@gra-maps/shared'
import type { Data, Mode } from './model.ts'
import { OUT_DIR } from './paths.ts'

const gzipAsync = promisify(gzip)

/** Published key (e.g. `communes/01001.json`) -> sha256 of the JSON written there. */
type Manifest = Record<string, string>
const MANIFEST_NAME = '.manifest.json'

type OutFile = { key: string; content: unknown }

function* outputFiles(data: Data): Generator<OutFile> {
  for (const r of data.regions.values()) yield { key: dataPaths.region(r.id), content: r }
  for (const d of data.departements.values()) yield { key: dataPaths.departement(d.id), content: d }
  for (const c of data.communes.values()) yield { key: dataPaths.commune(c.id), content: c }
  // TODO: jenks/*.json
  const common: Common = {
    regions: [...data.regions.keys()],
    departements: [...data.departements.keys()],
    communes: [...data.communes.keys()],
  }
  yield { key: dataPaths.common(), content: common }
}

async function readManifest(file: string): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as Manifest
  } catch {
    return {}
  }
}

/** Every file currently in `dir` (relative paths, `/` separated), empty if `dir` does not exist. */
async function listFiles(dir: string): Promise<Set<string>> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true })
    return new Set(
      entries.filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/')),
    )
  } catch {
    return new Set()
  }
}

async function atomicWrite(file: string, content: Buffer | string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, content)
  await rename(tmp, file)
}

/**
 * Writes every output file as gzip (level 9), atomically, in parallel.
 * - partial: a file is written only when it is missing or its JSON changed
 *   (compared with the hash kept in out/.manifest.json);
 * - full: every file is rewritten.
 * Any other file found in the output directory (no longer produced, leftover `.tmp`
 * of an interrupted run) is deleted, so the directory always mirrors this run.
 */
export async function writeOutput(data: Data, mode: Mode, outDir = OUT_DIR): Promise<void> {
  const manifestFile = path.join(outDir, MANIFEST_NAME)
  const previous = mode === 'full' ? {} : await readManifest(manifestFile)
  // What is left in this set after the loop is no longer produced and gets deleted.
  const stale = await listFiles(outDir)
  stale.delete(MANIFEST_NAME)
  const next: Manifest = {}
  const limit = pLimit(32)
  let written = 0

  const tasks: Promise<void>[] = []
  for (const { key, content } of outputFiles(data)) {
    const fileName = `${key}.gz`
    const present = stale.delete(fileName)
    // Serialize inside the task: only `limit` JSON strings exist at any time.
    tasks.push(
      limit(async () => {
        const json = JSON.stringify(content)
        const hash = createHash('sha256').update(json).digest('hex')
        next[key] = hash
        if (present && previous[key] === hash) return
        await atomicWrite(path.join(outDir, fileName), await gzipAsync(json, { level: 9 }))
        written++
      }),
    )
  }
  await Promise.all(tasks)

  await Promise.all([...stale].map((file) => rm(path.join(outDir, file), { force: true })))

  await atomicWrite(manifestFile, JSON.stringify(next))
  console.log(`[write] ${written} written, ${Object.keys(next).length - written} unchanged, ${stale.size} deleted`)
}
