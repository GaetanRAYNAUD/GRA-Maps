import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream } from 'node:stream/web'

/** Streams `url` to `dest`. Building block for the `fetch` of each source. */
export async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`GET ${url}: HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as ReadableStream), createWriteStream(dest))
}
