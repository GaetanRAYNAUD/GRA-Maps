import { source } from '../paths.ts'
import { etalabContours } from './etalab.ts'
import { geoApiCommunes } from './geo-api.ts'
import { cogFile, inseePageFile } from './insee-page.ts'
import { laposte } from './laposte.ts'
import { melodi } from './melodi.ts'

/**
 * Every input file of the generator. Nothing in sources/ is versioned: each source
 * must be downloadable from its producer (INSEE, La Poste, api.gouv.fr...) so the
 * whole output can be rebuilt from scratch.
 *
 * Sources without `fetch` still have to be identified on the producers' sites.
 */
export type Source = {
  id: string
  /** Absolute path of the file in sources/. */
  file: string
  /** Producer and dataset, for humans. */
  origin: string
  /**
   * Downloads the source to `dest`, a temporary file renamed to `file` afterwards. Side files
   * (metadata saved with the download) are written as `<dest><suffix>` and renamed to
   * `<file><suffix>` with it. Undefined while the download is not identified yet.
   */
  fetch?: (dest: string) => Promise<void>
  /**
   * Sources that must come from the same vintage: when one of them is missing, the whole group
   * is downloaded again (e.g. the COG lists and their change file).
   */
  group?: string
}

const def = (id: string, file: string, origin: string, fetch?: Source['fetch'], group?: string): Source => ({
  id,
  file: source(file),
  origin,
  fetch,
  group,
})

export const sources = {
  regions: def('regions', 'list/v_region.csv', 'INSEE, code officiel géographique (dernier millésime) : régions', cogFile('region'), 'cog'),
  departements: def(
    'departements',
    'list/v_departement.csv',
    'INSEE, code officiel géographique (dernier millésime) : départements',
    cogFile('departement'),
    'cog',
  ),
  communes: def(
    'communes',
    'list/v_commune.csv',
    'INSEE, code officiel géographique (dernier millésime) : communes',
    cogFile('commune'),
    'cog',
  ),
  communeChanges: def(
    'communeChanges',
    'list/v_mvt_commune.csv',
    'INSEE, code officiel géographique (dernier millésime) : changements de communes depuis 1943',
    cogFile('mvt_commune'),
    'cog',
  ),
  zipCodes: def('zipCodes', 'zipCodes/019HexaSmal.csv', 'La Poste, base officielle des codes postaux', laposte('laposte-hexasmal')),
  area: def(
    'area',
    'area/DS_RP_SERIE_HISTORIQUE.zip',
    'INSEE Melodi, séries historiques du recensement (superficie)',
    melodi('DS_RP_SERIE_HISTORIQUE'),
  ),
  population: def(
    'population',
    'pop/DS_POPULATIONS_HISTORIQUES.zip',
    'INSEE Melodi, populations municipales historiques',
    melodi('DS_POPULATIONS_HISTORIQUES'),
  ),
  populationHistory: def(
    'populationHistory',
    'pop/population-history.xlsx',
    'INSEE, historique des populations communales 1876 à aujourd’hui (insee.fr/fr/statistiques/3698339)',
    inseePageFile('3698339', /\.xlsx$/),
  ),
  birth: def(
    'birth',
    'birth/DS_ETAT_CIVIL_NAIS_COMMUNES.zip',
    'INSEE Melodi, naissances annuelles par commune',
    melodi('DS_ETAT_CIVIL_NAIS_COMMUNES'),
  ),
  death: def(
    'death',
    'death/DS_ETAT_CIVIL_DECES_COMMUNES.zip',
    'INSEE Melodi, décès annuels par commune',
    melodi('DS_ETAT_CIVIL_DECES_COMMUNES'),
  ),
  shapes: def(
    'shapes',
    'shapes/departements-100m.geojson.gz',
    'Etalab, contours administratifs (dernier millésime) : départements, précision 100 m',
    etalabContours('departements-100m'),
  ),
  points: def('points', 'point/communes.json', 'geo.api.gouv.fr, position des mairies et centre des communes', geoApiCommunes()),
} satisfies Record<string, Source>
