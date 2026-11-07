import { download } from './download.ts'

const SITE = 'https://www.insee.fr'

/**
 * Downloads a file attached to a publication page of insee.fr (`/fr/statistiques/{pageId}`),
 * for datasets not available in Melodi. The file name usually carries the vintage
 * (e.g. `base-pop-historiques-1876-2023.xlsx`), so the link is read from the page at
 * download time instead of being hardcoded.
 */
export const inseePageFile = (pageId: string, filePattern: RegExp) => async (dest: string) => {
  const page = `${SITE}/fr/statistiques/${pageId}`
  const res = await fetch(page)
  if (!res.ok) throw new Error(`GET ${page}: HTTP ${res.status}`)
  const html = await res.text()

  const links = [...html.matchAll(new RegExp(`href="(/fr/statistiques/fichier/${pageId}/[^"]+)"`, 'g'))]
    .map((m) => m[1]!)
    .filter((href) => filePattern.test(href))
  const unique = [...new Set(links)]
  if (unique.length !== 1) throw new Error(`${page}: expected one file matching ${filePattern}, found ${unique.join(', ') || 'none'}`)

  console.log(`[insee] ${unique[0]}`)
  await download(`${SITE}${unique[0]}`, dest)
}
