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

### Bilan du 08/11/2026 : écarts expliqués, rien à corriger côté générateur

**Référence INSEE.** Les fichiers Melodi contiennent aussi les totaux par département et par
région. Les sommes calculées par le générateur leur sont identiques sur toutes les valeurs :
population 2 507, naissances 1 962, décès 1 962, 0 écart. Les chiffres du nouveau générateur
sont donc ceux de l'INSEE, et les écarts avec l'ancien site viennent de l'ancien site.

**Anciens fichiers publiés**, comparés sur les 96 départements et un échantillon de
348 communes :

- Population : 9 % des communes de l'échantillon n'ont aucune population (01001 par exemple), et
  aucune n'a 2022-2023. Les totaux départementaux sont égaux, ou plus bas de 0,7 % au plus
  (communes fusionnées perdues par l'ancien traitement, qui ignorait les codes absents de sa
  liste de communes ; le nouveau les additionne dans la commune actuelle).
- Naissances et décès 2008-2013 : valeurs rattachées au mauvais département dans 84 départements
  (Seine-Saint-Denis 249 naissances en 2011 au lieu de 28 362, Haute-Saône 27 349 au lieu de
  2 643). Les autres années sont proches à 0,3 % près (même effet des fusions).
- Les rangs et les parts publiés en découlent (exemple : part de Paris dans les naissances
  d'Île-de-France, 45 % publiés contre 17 % réels).

**Différences voulues** :

- Nouveaux champs : population 1876-1962 complète, densité, naissances et décès par habitant
  et leurs rangs (absents des fichiers publiés), rangs de superficie (jamais calculés avant),
  `center`.
- Superficies à 2 décimales, comme l'INSEE (15,95 contre 15,9 km²).
- Codes postaux : le plus petit code de la commune (l'ancien gardait le dernier lu) ; Paris,
  Lyon, Marseille reçoivent le plus petit code de leurs arrondissements (absent avant).
- Jenks : classes identiques pour les régions et départements (superficie, population 2021),
  97 % des communes identiques, le reste à une classe près (données différentes, et `ckmeans`
  au lieu de l'ancien algorithme).

Les types de `shared/src/types.ts` ont été confrontés à ces fichiers : mêmes noms de champs.

## Front

L'ancien front ne sert que de liste de fonctionnalités ; son apparence et son UX ne sont pas
reprises. Le nouveau front (09/11/2026) couvre : carte par niveau, indicateur et année, légende
Jenks, survol, fiche (rangs, parts, courbe), recherche commune et adresse, URL partageable.

- Abandonnés : fond de carte IGN (carte choroplèthe pure), i18n (français seul), analytics.
- Recherche d'adresse : l'API `api-adresse.data.gouv.fr` est remplacée par la Géoplateforme
  (`https://data.geopf.fr/geocodage/search`).
- Chargement : seul le fichier Jenks de l'indicateur affiché est chargé (08/11/2026, JSON brut :
  `population.json` et `density.json` 12,9 Mo chacun, environ 4 fois moins compressés par le
  CDN). Piste si c'est encore trop lourd : découper par année (`jenks/{indicateur}/{année}.json`).
- Bornes des classes : générées depuis le 09/11/2026 (`bounds*` dans chaque nœud Jenks). Tant que
  les fichiers en ligne ne les ont pas, la légende retombe sur « Moins / Plus ».

## Ordre de travail restant

1. Générateur : écrit et validé contre les totaux INSEE (voir Parité).
2. Publication R2 : bucket, CORS et règle de cache en place, script écrit ; reste à créer les
   tokens et à faire la première publication, voir [hosting.md](hosting.md).
3. Front : carte, légende avec bornes, fiche et recherche en place.
4. Bascule du domaine `maps.gaetanraynaud.fr`.
