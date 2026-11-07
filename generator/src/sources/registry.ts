import { source } from '../paths.ts'
import { inseePageFile } from './insee-page.ts'
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
  /** Downloads the source to `dest`. Undefined while the download is not identified yet. */
  fetch?: (dest: string) => Promise<void>
}

const def = (id: string, file: string, origin: string, fetch?: Source['fetch']): Source => ({ id, file: source(file), origin, fetch })

export const sources = {
  regions: def('regions', 'list/region.csv.gz', 'INSEE, code officiel géographique : régions'),
  departements: def('departements', 'list/departement.csv.gz', 'INSEE, code officiel géographique : départements'),
  communes: def('communes', 'list/commune.csv.gz', 'INSEE, code officiel géographique : communes'),
  zipCodes: def('zipCodes', 'zipCodes/zipCodes.csv.gz', 'La Poste, base officielle des codes postaux'),
  areaRegions: def('areaRegions', 'area/superficie_regions.csv.gz', 'Observatoire des territoires, superficie des régions'),
  areaDepartements: def(
    'areaDepartements',
    'area/superficie_departements.csv.gz',
    'Observatoire des territoires, superficie des départements',
  ),
  areaCommunes: def('areaCommunes', 'area/superficie_communes.csv.gz', 'Observatoire des territoires, superficie des communes'),
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
  points: def('points', 'point/points.json.gz', 'api.gouv.fr, position des mairies'),
  pointsParis: def('pointsParis', 'point/paris.json.gz', 'api.gouv.fr, position des mairies d’arrondissement de Paris'),
} satisfies Record<string, Source>
