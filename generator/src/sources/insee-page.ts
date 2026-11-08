import { download, fetchWithTimeout } from './download.ts'

const SITE = 'https://www.insee.fr'

async function getPage(pathname: string): Promise<string> {
  const url = `${SITE}${pathname}`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`)
  return res.text()
}

/**
 * Downloads the single file attached to an insee.fr page (`pathname`, whose files live
 * under `/fr/statistiques/fichier/{pageId}/`) whose link matches `filePattern`.
 */
async function downloadPageFile(pathname: string, pageId: string, filePattern: RegExp, dest: string): Promise<void> {
  const html = await getPage(pathname)
  const links = [...html.matchAll(new RegExp(`href="(/fr/statistiques/fichier/${pageId}/[^"]+)"`, 'g'))]
    .map((m) => m[1]!)
    // search() ignores lastIndex, so a g/y flag on filePattern does not skip links
    .filter((href) => href.search(filePattern) !== -1)
  const unique = [...new Set(links)]
  if (unique.length !== 1)
    throw new Error(`${SITE}${pathname}: expected one file matching ${filePattern}, found ${unique.join(', ') || 'none'}`)

  console.log(`[insee] ${unique[0]}`)
  await download(`${SITE}${unique[0]}`, dest)
}

/**
 * Downloads a file attached to a publication page of insee.fr (`/fr/statistiques/{pageId}`),
 * for datasets not available in Melodi. The file name usually carries the vintage
 * (e.g. `base-pop-historiques-1876-2023.xlsx`), so the link is read from the page at
 * download time instead of being hardcoded.
 */
export const inseePageFile = (pageId: string, filePattern: RegExp) => (dest: string) =>
  downloadPageFile(`/fr/statistiques/${pageId}`, pageId, filePattern, dest)

/** Index of the Code officiel géographique: one "Millésime YYYY : Téléchargement des fichiers" link per year. */
const COG_INDEX = '/fr/information/2560452'

type CogVintage = { year: number; pageId: string }
let latestCog: Promise<CogVintage> | undefined

/** Latest COG vintage listed on the index page, looked up once per run. */
function latestCogVintage(): Promise<CogVintage> {
  latestCog ??= (async () => {
    const html = await getPage(COG_INDEX)
    const vintages = [...html.matchAll(/Millésime\s+(\d{4})(?:&nbsp;|\s)*:\s*<a [^>]*href="\/fr\/information\/(\d+)"/g)].map((m) => ({
      year: Number(m[1]),
      pageId: m[2]!,
    }))
    const latest = vintages.reduce<CogVintage | undefined>((best, v) => (best && best.year >= v.year ? best : v), undefined)
    if (!latest) throw new Error(`${SITE}${COG_INDEX}: no COG vintage found`)
    console.log(`[insee] COG ${latest.year} (/fr/information/${latest.pageId})`)
    return latest
  })().catch((e: unknown) => {
    latestCog = undefined
    throw e
  })
  return latestCog
}

/**
 * Downloads `v_{name}_{year}.csv` of the latest COG vintage. The file is the CSV served
 * by INSEE, kept as is (comma separated, quoted, UTF-8).
 */
export const cogFile = (name: 'region' | 'departement' | 'commune') => async (dest: string) => {
  const { year, pageId } = await latestCogVintage()
  await downloadPageFile(`/fr/information/${pageId}`, pageId, new RegExp(`/v_${name}_${year}\\.csv$`), dest)
}
