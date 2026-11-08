import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream } from 'node:stream/web'

/** Upper bound for one request, body included, so a stalled server fails instead of hanging. */
const TIMEOUT_MS = 10 * 60_000

/** `fetch` with the generator timeout. Use it for every request made while fetching sources. */
export const fetchWithTimeout = (url: string) => fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })

/** Streams `url` to `dest`. Building block for the `fetch` of each source. */
export async function download(url: string, dest: string): Promise<void> {
  const res = await fetchWithTimeout(url)
  if (!res.ok || !res.body) throw new Error(`GET ${url}: HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(dest))
}
