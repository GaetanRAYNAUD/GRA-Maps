# Migration depuis l'ancien site

Seul endroit du repo qui parle de l'ancien projet. À supprimer une fois la migration terminée.

## Anciens repos (référence uniquement, ne pas reprendre le code)

| Repo                                                                        | Local                          | GitHub                                  |
| --------------------------------------------------------------------------- | ------------------------------ | --------------------------------------- |
| Parser Java 17 / Spring Boot : source de vérité de la logique de génération | `H:\projets\Maps\maps-parser`  | https://github.com/Osallek/maps-parser  |
| Front CRA / React 18, MUI, react-map-gl, recharts, react-intl, react-ga4    | `H:\projets\Maps\osamapsfront` | https://github.com/Osallek/osamapsfront |

Java : `maps-parser/src/main/java/fr/osallek/mapsparser/` : `service/object/*` (modèle),
`service/**/*GenerationService.java` (logique), `MapsParserService.java` (écriture).
Le Java tenait un état incrémental `data/data.json.gz` ; le nouveau générateur repart toujours des
sources.

## Étapes du générateur et classes Java

| Étape           | Classe Java                                            | Points d'attention                                                                                                                          |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-list`       | `service/insee/list/ListGenerationService`             | Ignorer les DROM-COM : régions dont l'id commence par `0`, départements `97x`                                                               |
| `02-zip-codes`  | `service/laposte/ZipCodeGenerationService`             | Séparateur `;`, BOM dans le header                                                                                                          |
| `03-area`       | `service/odt/AreaGenerationService`                    | Anciens fichiers `superficie_{regions,departements,communes}` (Observatoire des territoires), remplacés par Melodi `DS_RP_SERIE_HISTORIQUE` |
| `04-population` | `service/insee/population/PopulationGenerationService` | Ancien fichier `base_pop_historiques`, remplacé par Melodi                                                                                  |
| `05-birth`      | `service/insee/birth/BirthGenerationService`           | Ancien `base_naissances`, remplacé par Melodi                                                                                               |
| `06-death`      | `service/insee/death/DeathGenerationService`           | Ancien `base_deces` (ISO-8859-1), remplacé par Melodi                                                                                       |
| `07-points`     | `service/gouv/point/PointGenerationService`            | `points.json` + `paris.json`, coordonnées `[lon, lat]` vers `{ lat, lon }`                                                                  |
| `08-intern`     | `service/intern/InternPopGenerationService`            | Agrégation commune, département, région ; rangs et pourcentages (pays/région/département), densité, naissances et décès par habitant, Jenks |
| (abandonné)     | `service/insee/population/all/PopAllService`           | Voir [ideas.md](ideas.md)                                                                                                                   |

Jenks : le Java reprend du code GPL-3 (genepi/haplocheck, `common/Jenks.java`). Ne pas le
traduire ; vérifier seulement la parité des classes.

Sources locales du Java copiées dans `generator/sources/` (non versionnées, à remplacer par des
téléchargements) : `point/`.

## Parité

Garder une copie de la dernière sortie Java (`data/`) dans `generator/reference/` et comparer
fichier par fichier avec `generator/out/` (`npm run parity -w generator`, à écrire), avec une
tolérance sur les flottants. Toute divergence est expliquée ou corrigée avant publication.
Le dossier `data/` n'est pas dans le repo Java local : à récupérer, ou repartir des fichiers déjà
publiés en prod.

Les types de `shared/src/types.ts` viennent de `osamapsfront/src/types/api.types.ts` : à confronter
à la vraie sortie pendant la parité.

## Front : à récupérer de l'ancien

- Vues, indicateurs affichés, légende Jenks, popups et fiches (`src/screens/`).
- Recherche d'adresse : `https://api-adresse.data.gouv.fr/search`.
- Fond de carte IGN, style dans `src/screens/map/map-style.ts`.
- i18n (react-intl, `src/i18n/fr/`), analytics react-ga4 (à confirmer).
- Chargement : un `fetch` par fichier, `common.json` et `jenks/*` au démarrage,
  région/département/commune à la demande, cache mémoire.

## Ordre de travail restant

1. Retrouver toutes les sources en téléchargement (reste : position des
   mairies).
2. Générateur : List + Area + Population vers `common`/`regions`/`departements`, test de parité.
3. Naissances, décès, points, agrégations, Jenks, communes.
4. Publication R2 + règles Cloudflare (CORS, cache, purge), voir [hosting.md](hosting.md).
5. Front : carte + une vue, puis le reste.
6. Bascule du domaine `maps.gaetanraynaud.fr`.
