# Idées mises de côté

## Pyramide des âges (population par sexe et âge)

Retirée de la première version : elle n'était affichée nulle part et grossissait énormément les
JSON des communes.

Si elle revient :

- Source : INSEE Melodi `DS_RP_TD_POPULATION_AGESEX_PRINC` (tableau POP1 du recensement). Un seul
  millésime (2023), zip CSV d'environ 73 Mo.
  Catalogue : `https://api.insee.fr/melodi/catalog/DS_RP_TD_POPULATION_AGESEX_PRINC`.
  Les millésimes plus anciens seraient à chercher dans les archives du recensement sur insee.fr.
- Ne garder que les lignes communes, puis sommer communes, départements, régions.
- Ne pas la mettre dans `communes/*.json` : la publier dans des fichiers séparés chargés à la
  demande (par exemple `pyramid/communes/{id}.json`), et envisager des tranches de 5 ans plutôt
  que des âges détaillés.

## Nos propres tuiles de frontières

Aujourd'hui la carte utilise les tuiles de data.gouv.fr (voir [geography.md](geography.md)). Les
générer nous-mêmes donnerait la maîtrise du millésime (frontières toujours alignées sur le COG des
données) et supprimerait la dépendance à leur serveur.

- Source : contours administratifs d'Etalab, un dossier par année depuis 2018,
  `https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/{année}/geojson/` (`latest/`
  pour le dernier). Fichiers `regions-*`, `departements-*`, `communes-*`, `epci-*`,
  `communes-associees-deleguees-*`, en 4 précisions (5m, 50m, 100m, 1000m), en `.geojson` ou
  `.geojson.gz`. Propriétés : `code`, `nom`, `departement`, `region`, `epci`.
- Tailles 2026 (gzip) : communes 5m 90 Mo, 50m 17,6 Mo, 100m 8,2 Mo ; départements 5m 12,7 Mo ;
  régions 5m 8,7 Mo.
- Outil : `tippecanoe` (via Docker sous Windows). Les tuiles data.gouv.fr sont faites ainsi, une
  couche par niveau puis `tile-join` :
  `tippecanoe -l regions --generate-ids --no-tile-stats --drop-densest-as-needed --detect-shared-borders -Z3 -z12 -o regions.mbtiles regions-5m.geojson.gz`
  (idem `departements` en `-Z3 -z12`, `communes` en `-Z8 -z12`). Garder les mêmes noms de couches
  (`regions`, `departements`, `communes`) et l'identifiant `code`, pour ne rien changer côté front.
- Sortie : un seul fichier PMTiles (`tile-join` ou `pmtiles convert`) sur R2, servi par le même
  domaine que les données, lu par MapLibre avec le protocole `pmtiles://` (librairie `pmtiles`).
  Estimation : quelques dizaines de Mo, jusqu'à 200 Mo environ avec les communes au zoom 12 ; à
  mesurer. Vérifier que le CDN gère bien les requêtes par plage (`Range`) sur ce fichier.
- Fréquence : une fois par an, au nouveau COG, à la main comme le reste de la génération (étape
  ou script séparé, sources dans `generator/sources/`, non versionnées).
- Bonus possible ensuite : un PMTiles par année (2018 et après) pour changer les frontières avec la
  date choisie. Abandonné pour l'instant, faute de données dans la géographie de chaque année
  (voir [geography.md](geography.md)).

Historique de la migration : [migration.md](migration.md).
