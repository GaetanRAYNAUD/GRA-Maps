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
| `07-points`     | `service/gouv/point/PointGenerationService`            | Ancienne API `etablissements-publics` (`mairie`, `paris_mairie`), remplacée par geo.api.gouv.fr ; `[lon, lat]` vers `{ lat, lon }`          |
| `08-intern`     | `service/intern/InternPopGenerationService`            | Agrégation commune, département, région ; rangs et pourcentages (pays/région/département), densité, naissances et décès par habitant, Jenks |
| (abandonné)     | `service/insee/population/all/PopAllService`           | Voir [ideas.md](ideas.md)                                                                                                                   |

Jenks : le Java reprend du code GPL-3 (genepi/haplocheck, `common/Jenks.java`). Ne pas le
traduire ; vérifier seulement la parité des classes.

Toutes les sources du Java sont remplacées par des téléchargements (voir le README pour la liste).
Les mairies venaient de `etablissements-publics.api.gouv.fr` (fermée) ; elles viennent maintenant de
geo.api.gouv.fr, qui donne aussi le centre de chaque commune (`center`, nouveau champ).

## Parité

`npm run parity -w generator` compare `generator/out/` avec les fichiers placés dans
`generator/reference/` (même arborescence), champ par champ, avec une tolérance sur les
flottants. Le dossier `data/` du Java n'existe plus ; la référence disponible, ce sont les
fichiers encore servis par l'ancien site (`https://maps.gaetanraynaud.fr/data/...`).

Constats du 08/11/2026 (communes 01001 et 75056, département 01, région 11, Jenks) :

- Les fichiers publiés sont incomplets : 01001 n'a aucune population, Paris n'a pas 2022-2023,
  les totaux régionaux de naissances sont bien plus bas (part de Paris dans les naissances
  d'Île-de-France : 45 % publiés contre 17 % calculés). Les écarts de rangs et de parts en
  découlent.
- Nouveaux champs : population 1876-1962 complète, densité, naissances et décès par habitant
  et leurs rangs (absents des fichiers publiés), rangs de superficie (jamais calculés par le
  Java), `center`.
- Naissances et décès : Melodi donne des totaux un peu différents de l'ancien fichier (01 en
  2008 : 7 323 naissances contre 7 019).
- Superficies : 2 décimales au lieu de 1 (15,95 contre 15,9 km²).
- Codes postaux : on garde le plus petit code de la commune (le Java gardait le dernier lu), et
  Paris, Lyon, Marseille reçoivent le plus petit code de leurs arrondissements (absent avant).
- Jenks : classes identiques pour régions et départements (superficie, population 2021),
  97 % des communes identiques, le reste à une classe près.

Les types de `shared/src/types.ts` ont été confrontés à ces fichiers : mêmes noms de champs.

## Front : à récupérer de l'ancien

- Vues, indicateurs affichés, légende Jenks, popups et fiches (`src/screens/`).
- Recherche d'adresse : `https://api-adresse.data.gouv.fr/search`.
- Fond de carte IGN, style dans `src/screens/map/map-style.ts`.
- i18n (react-intl, `src/i18n/fr/`), analytics react-ga4 (à confirmer).
- Chargement : un `fetch` par fichier, `common.json` et `jenks/*` au démarrage,
  région/département/commune à la demande, cache mémoire.

## Ordre de travail restant

1. Générateur : écrit (toutes les étapes, Jenks, sortie). Reste à valider les écarts de parité
   ci-dessus.
2. Publication R2 + règles Cloudflare (CORS, cache, purge), voir [hosting.md](hosting.md).
3. Front : carte + une vue, puis le reste.
4. Bascule du domaine `maps.gaetanraynaud.fr`.
