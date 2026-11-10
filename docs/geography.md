# Géographie et millésimes

## Principe : une seule géographie, celle du dernier COG

Toutes les années (de 1876 à aujourd'hui) sont calculées et affichées dans la géographie du
dernier millésime du code officiel géographique (COG), téléchargé par l'étape `01-list`.

C'est déjà la convention de l'INSEE : ses séries historiques sont publiées « dans la géographie en
vigueur » (communes fusionnées additionnées, dans leurs frontières actuelles). Il n'y a donc rien
à reconstruire pour les années anciennes.

Abandonné : afficher les frontières de chaque année. Il faudrait les données de chaque année dans
la géographie de l'époque, que l'INSEE ne publie pas (seules d'anciennes éditions de certains
fichiers existent), pour un gain limité :

- les régions et départements n'ont pas changé depuis 2016 ;
- côté communes, environ 900 ont été absorbées dans des communes nouvelles entre 2018 et 2026
  (dont 651 en 2019), soit environ 3 % des communes, visibles seulement au zoom communal.

## Rapprochement des sources

Chaque source a son propre millésime de géographie :

| Source                                               | Où le lire                                                                  | Au 08/11/2026                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| COG (régions, départements, communes)                | Page des millésimes, année dans le nom du fichier (`v_commune_AAAA`)        | 2026                                                      |
| Melodi (naissances, décès, superficies, populations) | Champ `spatialTemporal` de l'entrée du catalogue (`<fichier>.catalog.json`) | 2026 (naissances, décès, superficies), 2025 (populations) |
| Historique des populations 1876+ (xlsx)              | Ligne de titre « Géographie au 01/01/AAAA »                                 | 2025                                                      |

Quand une source est en retard sur le COG, ses codes de communes sont convertis avec le fichier des
changements du COG (`v_mvt_commune_AAAA.csv`, publié avec chaque millésime) :

- fusion ou commune nouvelle (`MOD` 31, 32, 33, 34) : les valeurs des anciennes communes sont
  additionnées dans la commune résultante ;
- changement de code (41, 50) : la valeur suit le nouveau code ;
- changement de nom (10) ou de statut sans effet sur le périmètre : rien à faire, on joint par
  code ;
- rétablissement (21, une commune ressort d'une commune nouvelle) : impossible de découper les
  valeurs passées. La commune rétablie n'a pas de valeur pour les années de la source, et le
  générateur le signale dans les logs.

Au millésime 2026, le fichier des changements ne contient aucune fusion ni création au
1er janvier 2026 : pas de trou entre les populations (géographie 2025) et le COG 2026.

## Frontières affichées

### Régions et départements : nos contours simplifiés

Depuis le 09/11/2026, les régions et les départements sont dessinés depuis
`shapes/regions.json` et `shapes/departements.json`, produits par l'étape `09-shapes` du
générateur :

- source : contours Etalab des départements, précision 100 m
  (`contours-administratifs/latest/geojson/departements-100m.geojson.gz`) ;
- simplification avec mapshaper (Visvalingam pondéré, 10 % des points gardés, topologie
  conservée), coordonnées à 4 décimales ;
- régions = fusion de leurs départements : les deux niveaux ont exactement les mêmes frontières.

La même étape écrit `shapes/places.json`, les noms de lieux dessinés sur la carte : chefs-lieux
et communes d'au moins 5 000 habitants, au centre de la commune (geo.api.gouv.fr).

Le fond du monde (terres, mer, pays voisins) vient d'OpenFreeMap (OpenStreetMap, sans clé).

Pourquoi : les tuiles gardent le détail du 5 m à toutes les échelles et simplifient chaque
niveau à part. Vue de loin, les contours « bavaient » et le trait des régions ne tombait pas sur
les coutures des départements.

### Communes : tuiles data.gouv.fr

Les communes (et les limites de départements dessinées autour d'elles) viennent toujours des
tuiles vectorielles de data.gouv.fr :
`https://openmaptiles.geo.data.gouv.fr/data/decoupage-administratif.json` (couches `regions`,
`departements`, `communes`, identifiants `code`). Elles sont générées à partir des contours
administratifs d'Etalab (version 5 m).

Les tuiles contiennent aussi les arrondissements municipaux de Paris (751xx), Lyon (6938x) et
Marseille (132xx), superposés à leur commune. Les données n'existent qu'à la commune (les
sources INSEE regroupent les arrondissements) : le front les filtre (`MapView.tsx`) pour que la
commune s'affiche entière.

On ne génère pas nos propres tuiles : sans frontières par année, ça n'apporterait que la maîtrise
du millésime. La dépendance au serveur de data.gouv.fr est acceptée.

Risque : les tuiles ne suivent pas forcément chaque millésime (dernière mise à jour constatée :
avril 2025, vraisemblablement en géographie 2025). La jointure se fait par code INSEE, donc un
changement de nom ne casse rien, mais une fusion donne une commune nouvelle sans forme et des
anciennes communes sans données.

Contrôle à chaque génération (`generator/src/compute/check-borders.ts`) : le générateur date
les tuiles (en-tête `Last-Modified` d'une tuile, 17/04/2025 au 08/11/2026) et liste les
changements du COG (`v_mvt_commune`) entrés en vigueur depuis. Sans changement, il l'indique ;
sinon, il avertit avec les communes dont la forme affichée est périmée et les anciens codes
encore dessinés sans données. Il ne fait jamais échouer la génération (tuiles injoignables :
simple avertissement). Les contours Etalab par année
(`https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/{année}/geojson/`, de 2018 à
aujourd'hui) restent la source si on génère un jour nos propres tuiles.

Si l'écart devient gênant :

1. générer les données dans le millésime des tuiles, avec le même fichier des changements ;
2. ou générer nos propres tuiles depuis les contours Etalab : marche à suivre dans
   [ideas.md](ideas.md#nos-propres-tuiles-de-frontières).
