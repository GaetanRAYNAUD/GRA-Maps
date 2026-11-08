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

## Frontières affichées : tuiles data.gouv.fr

La carte utilise les tuiles vectorielles de data.gouv.fr :
`https://openmaptiles.geo.data.gouv.fr/data/decoupage-administratif.json` (couches `regions`,
`departements`, `communes`, identifiants `code`). Elles sont générées à partir des contours
administratifs d'Etalab (version 5 m).

On ne génère pas nos propres tuiles : sans frontières par année, ça n'apporterait que la maîtrise
du millésime. La dépendance au serveur de data.gouv.fr est acceptée.

Risque : les tuiles ne suivent pas forcément chaque millésime (dernière mise à jour constatée :
avril 2025, vraisemblablement en géographie 2025). La jointure se fait par code INSEE, donc un
changement de nom ne casse rien, mais une fusion donne une commune nouvelle sans forme et des
anciennes communes sans données.

Parade prévue (à écrire) : à la génération, comparer les codes de communes du COG avec ceux des
contours Etalab du même millésime
(`https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/{année}/geojson/`, publiés de
2018 à aujourd'hui) et afficher un avertissement listant les écarts. Les contours contiennent en
plus les arrondissements municipaux (Paris, Lyon, Marseille) et les collectivités d'outre-mer, à
ignorer dans la comparaison.

Si l'écart devient gênant :

1. générer les données dans le millésime des tuiles, avec le même fichier des changements ;
2. ou générer nos propres tuiles depuis les contours Etalab : marche à suivre dans
   [ideas.md](ideas.md#nos-propres-tuiles-de-frontières).
