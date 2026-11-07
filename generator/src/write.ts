import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import pLimit from 'p-limit'
import { dataPaths, type Common } from '@osamaps/shared'
import type { Data, Mode } from './model.ts'
import { OUT_DIR } from './paths.ts'

const gzipAsync = promisify(gzip)

/** Published key (e.g. `communes/01001.json`) -> sha256 of the JSON written there. */
type Manifest = Record<string, string>
const MANIFEST = path.join(OUT_DIR, '.manifest.json')

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

const fileOf = (key: string) => path.join(OUT_DIR, `${key}.gz`)

async function readManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(MANIFEST, 'utf8')) as Manifest
  } catch {
    return {}
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
 * Files produced by a previous run and no longer produced are deleted.
 */
export async function writeOutput(data: Data, mode: Mode): Promise<void> {
  const old = await readManifest()
  const previous = mode === 'full' ? {} : old
  const next: Manifest = {}
  const limit = pLimit(32)
  let written = 0

  const tasks: Promise<void>[] = []
  for (const { key, content } of outputFiles(data)) {
    const json = JSON.stringify(content)
    const hash = createHash('sha256').update(json).digest('hex')
    next[key] = hash
    if (previous[key] === hash && existsSync(fileOf(key))) continue
    tasks.push(
      limit(async () => {
        await atomicWrite(fileOf(key), await gzipAsync(json, { level: 9 }))
        written++
      }),
    )
  }
  await Promise.all(tasks)

  const stale = Object.keys(old).filter((key) => !(key in next))
  await Promise.all(stale.map((key) => rm(fileOf(key), { force: true })))

  await atomicWrite(MANIFEST, JSON.stringify(next))
  console.log(`[write] ${written} written, ${Object.keys(next).length - written} unchanged, ${stale.length} deleted`)
}
