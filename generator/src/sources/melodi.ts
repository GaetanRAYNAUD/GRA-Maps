import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { download, fetchWithTimeout } from './download.ts'

/**
 * INSEE Melodi open data API (public, no key).
 * - catalog: https://api.insee.fr/melodi/catalog/all (every dataset) or /catalog/{id}
 * - columns and code lists: https://api.insee.fr/melodi/range/{id}
 *
 * File URLs carry the vintage (`..._2025_CSV_FR`) and the yearless form is rejected,
 * so the URL is read from the catalog at download time: a new vintage is picked up
 * automatically.
 */
const API = 'https://api.insee.fr/melodi'

type Product = { id: string; format: string; language?: string; accessURL: string; byteSize?: number }
type CatalogEntry = { identifier: string; modified: string; product?: Product[] }

/**
 * Downloads the French CSV of a Melodi dataset. The file is the zip served by INSEE,
 * kept as is (`<id>_data.csv` + `<id>_metadata.csv`). The catalog entry is saved
 * next to it as `<id>.catalog.json`, to know which vintage was downloaded.
 */
export const melodi = (datasetId: string) => async (dest: string) => {
  const res = await fetchWithTimeout(`${API}/catalog/${datasetId}`)
  if (!res.ok) throw new Error(`Melodi catalog ${datasetId}: HTTP ${res.status}`)
  const entry = (await res.json()) as CatalogEntry

  const csv = (entry.product ?? []).filter((p) => p.format === 'CSV' && p.language === 'FR')
  if (csv.length !== 1)
    throw new Error(`Melodi ${datasetId}: expected one French CSV product, found ${csv.map((p) => p.id).join(', ') || 'none'}`)
  const product = csv[0]!

  console.log(`[melodi] ${product.id} (modified ${entry.modified}, ${product.byteSize ?? '?'} bytes)`)
  await download(product.accessURL, dest)
  await writeFile(path.join(path.dirname(dest), `${datasetId}.catalog.json`), JSON.stringify(entry, null, 2))
}
