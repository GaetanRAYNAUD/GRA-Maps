/**
 * Publishes generator/out/ to the R2 bucket behind maps-data.gaetanraynaud.fr.
 *
 * 1. Compares every local file with the bucket by MD5 (the ETag R2 gives single-part
 *    uploads): only new or changed files are uploaded.
 * 2. Each object keeps its path in out/ as key (`.manifest.json` and `.tmp` files excepted),
 *    plain JSON, with Content-Type: application/json and Cache-Control: public, max-age=300.
 *    Compression is done by the Cloudflare CDN.
 * 3. common.json is uploaded last, so it never lists files not yet published; objects no longer
 *    produced are deleted after it.
 * 4. The Cloudflare cache of the data host is purged (dedicated API token), only if something
 *    changed.
 *
 * Usage: `npm run publish:data [-- options]`:
 * - `--dry-run`: lists the changes, writes nothing;
 * - `--purge`: purges the cache even when nothing changed (after a failed purge);
 * - `--allow-deletes`: allows deleting more than 5% of the bucket (an incomplete out/ would
 *   otherwise wipe the published data);
 * - `--only <prefix>`: limits the sync (uploads and deletions) to keys starting with `prefix`,
 *   e.g. `--only regions/`; common.json is then left alone unless the prefix matches it.
 * Reads its settings from the root `.env` (see .env.example). Manual only, never in a build.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import pLimit from 'p-limit'
import { dataPaths } from '@gra-maps/shared'
import { OUT_DIR } from '../generator/src/paths.ts'
import { planPublish, type LocalFile } from './publish-plan.ts'

const DATA_HOST = 'maps-data.gaetanraynaud.fr'
const CACHE_CONTROL = 'public, max-age=300'
const CONCURRENCY = 16
/** Above this share of the bucket, deletions need `--allow-deletes` (guards against an incomplete out/). */
const MAX_DELETE_SHARE = 0.05

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name} in .env (see .env.example)`)
  return value
}

async function localFiles(only: string): Promise<LocalFile[]> {
  const entries = await readdir(OUT_DIR, { recursive: true, withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile() && !e.name.startsWith('.') && !e.name.endsWith('.tmp'))
    .map((e) => path.relative(OUT_DIR, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
  if (!files.includes(dataPaths.common())) throw new Error(`${OUT_DIR} has no ${dataPaths.common()}: run npm run generate first`)
  const limit = pLimit(64)
  return Promise.all(
    files
      .filter((key) => key.startsWith(only))
      .map((key) =>
        limit(async () => ({
          key,
          md5: createHash('md5')
            .update(await readFile(path.join(OUT_DIR, key)))
            .digest('hex'),
        })),
      ),
  )
}

async function remoteObjects(s3: S3Client, bucket: string, prefix: string): Promise<Map<string, string>> {
  const objects = new Map<string, string>()
  let token: string | undefined
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix || undefined, ContinuationToken: token }))
    for (const o of page.Contents ?? []) if (o.Key) objects.set(o.Key, (o.ETag ?? '').replaceAll('"', ''))
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  return objects
}

async function upload(s3: S3Client, bucket: string, key: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: await readFile(path.join(OUT_DIR, key)),
      ContentType: 'application/json',
      CacheControl: CACHE_CONTROL,
    }),
  )
}

async function purge(zoneId: string, token: string): Promise<void> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hosts: [DATA_HOST] }),
  })
  // The body may not be JSON (proxy or 5xx error page): fall back to the HTTP status.
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; errors?: { message: string }[] }
  if (!res.ok || !body.success)
    throw new Error(`Cache purge failed (HTTP ${res.status}): ${body.errors?.map((e) => e.message).join(', ') || 'no error details'}`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      purge: { type: 'boolean', default: false },
      'allow-deletes': { type: 'boolean', default: false },
      only: { type: 'string', default: '' },
    },
  })
  const dryRun = values['dry-run']

  const bucket = env('R2_BUCKET')
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') },
    // R2 does not need the default CRC checksums of recent SDK versions.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  const zoneId = dryRun ? '' : env('CLOUDFLARE_ZONE_ID')
  const purgeToken = dryRun ? '' : env('CLOUDFLARE_PURGE_TOKEN')

  const only = values.only
  const [local, remote] = await Promise.all([localFiles(only), remoteObjects(s3, bucket, only)])
  if (only) console.log(`Limited to keys starting with "${only}"`)
  const plan = planPublish(local, remote, dataPaths.common())
  const toUpload = plan.uploads.length + (plan.last ? 1 : 0)
  console.log(`${local.length} files: ${toUpload} to upload, ${plan.unchanged} unchanged, ${plan.deletes.length} to delete`)

  if (dryRun) {
    for (const key of [...plan.uploads, ...(plan.last ? [plan.last] : [])].slice(0, 20)) console.log(`  upload ${key}`)
    for (const key of plan.deletes.slice(0, 20)) console.log(`  delete ${key}`)
    console.log('Dry run: nothing written')
    return
  }
  if (remote.size > 0 && plan.deletes.length > remote.size * MAX_DELETE_SHARE && !values['allow-deletes'])
    throw new Error(
      `${plan.deletes.length} of ${remote.size} published files would be deleted: is out/ complete? Rerun with --allow-deletes if this is expected.`,
    )
  if (toUpload === 0 && plan.deletes.length === 0) {
    if (!values.purge) {
      console.log('Nothing to publish (use --purge to purge the cache anyway)')
      return
    }
    await purge(zoneId, purgeToken)
    console.log(`Nothing to publish, cache of ${DATA_HOST} purged`)
    return
  }

  const limit = pLimit(CONCURRENCY)
  let done = 0
  await Promise.all(
    plan.uploads.map((key) =>
      limit(async () => {
        await upload(s3, bucket, key)
        if (++done % 1000 === 0) console.log(`  ${done}/${plan.uploads.length} uploaded`)
      }),
    ),
  )
  if (plan.last) await upload(s3, bucket, plan.last)
  console.log(`${toUpload} uploaded`)

  // One request per object: deletions are rare and few, and DeleteObjects (batch) requires a
  // body checksum whose header R2 has not always accepted.
  await Promise.all(plan.deletes.map((Key) => limit(() => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key })))))
  if (plan.deletes.length) console.log(`${plan.deletes.length} deleted`)

  try {
    await purge(zoneId, purgeToken)
  } catch (e) {
    throw new Error('Files are published but the cache still serves the old ones: fix the purge, then rerun with --purge', { cause: e })
  }
  console.log(`Cache of ${DATA_HOST} purged`)
}

try {
  await main()
} catch (e) {
  for (let err: unknown = e, prefix = ''; err !== undefined; prefix = '  caused by: ') {
    console.error(prefix + (err instanceof Error ? err.message : String(err)))
    err = err instanceof Error ? err.cause : undefined
  }
  process.exitCode = 1
}
