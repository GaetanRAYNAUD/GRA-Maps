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

Historique de la migration : [migration.md](migration.md).
