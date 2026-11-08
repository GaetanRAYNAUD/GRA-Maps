import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { download, fetchWithTimeout } from './download.ts'

/**
 * La Poste open data portal (data-fair, public, no key).
 * - dataset metadata: https://data.laposte.fr/data-fair/api/v1/datasets/{id}
 * - downloadable files: https://data.laposte.fr/data-fair/api/v1/datasets/{id}/data-files
 */
const API = 'https://data.laposte.fr/data-fair/api/v1/datasets'

type DataFile = { key: string; name: string; size?: number; updatedAt?: string; url: string }
type Dataset = { id: string; dataUpdatedAt?: string; file?: { encoding?: string } }

/**
 * Downloads a file of a La Poste dataset, `original` by default (the file as published by
 * La Poste, as opposed to the `full` file enriched by the portal). The file URL is read from
 * the data-files listing at download time. The dataset metadata is saved next to it as
 * `<id>.dataset.json`, to know which update was downloaded and the file encoding.
 */
export const laposte =
  (datasetId: string, fileKey = 'original') =>
  async (dest: string) => {
    const get = async <T>(url: string): Promise<T> => {
      const res = await fetchWithTimeout(url)
      if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`)
      return (await res.json()) as T
    }
    const [dataset, files] = await Promise.all([get<Dataset>(`${API}/${datasetId}`), get<DataFile[]>(`${API}/${datasetId}/data-files`)])

    const file = files.find((f) => f.key === fileKey)
    if (!file) throw new Error(`La Poste ${datasetId}: no "${fileKey}" file, found ${files.map((f) => f.key).join(', ') || 'none'}`)

    console.log(`[laposte] ${file.name} (data updated ${dataset.dataUpdatedAt ?? '?'}, ${file.size ?? '?'} bytes)`)
    await download(file.url, dest)
    await writeFile(path.join(path.dirname(dest), `${datasetId}.dataset.json`), JSON.stringify(dataset, null, 2))
  }
