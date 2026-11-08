# GRA-Maps — maps.gaetanraynaud.fr

Cartes de la France (régions, départements, communes) : population, naissances, décès, densité, superficie.

## Structure

| Dossier         | Rôle                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| `web/`          | Front React + Vite + TypeScript, déployé en assets statiques sur Cloudflare Workers |
| `generator/`    | Node 26 + TypeScript : génère les JSON à partir de `generator/sources/` vers `out/` |
| `shared/`       | Types et chemins des fichiers de données, partagés entre `generator/` et `web/`     |
| `scripts/`      | Publication des données vers R2 (`maps-data.gaetanraynaud.fr`)                      |
| `wrangler.toml` | Worker en assets uniquement (aucune invocation de Worker)                           |

## Commandes

```bash
npm install
npm run dev            # front sur http://localhost:5173
npm run build          # build du front dans web/dist
npm run generate       # mode partiel : sources manquantes et fichiers manquants ou modifiés
npm run generate:full  # mode full : retélécharge toutes les sources, réécrit tout
npm run publish:data   # synchronise generator/out/ vers R2 (manuel uniquement)
npm run deploy         # build + wrangler deploy
```

Le front est déployé par Cloudflare Workers Builds à chaque push sur `master` (voir
[docs/hosting.md](docs/hosting.md)). La génération et la publication des données restent manuelles.

## Générateur

Tout doit pouvoir être régénéré de zéro : `generator/sources/` n'est pas versionné, chaque source
est téléchargée depuis son producteur. La liste est dans
[generator/src/sources/registry.ts](generator/src/sources/registry.ts) (fichier, origine, fonction
de téléchargement).

- **partiel** (`npm run generate`) : télécharge uniquement les sources absentes, puis n'écrit que
  les fichiers de sortie absents ou dont le contenu a changé (hash dans `out/.manifest.json`).
  Pour rafraîchir une source : supprimer son fichier dans `generator/sources/` et relancer.
- **full** (`npm run generate:full`) : retélécharge toutes les sources et réécrit toute la sortie.

Dans les deux modes, les fichiers de sortie qui ne sont plus produits sont supprimés.

## Sources des données

| Source                          | Producteur                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Régions, départements, communes | INSEE, [code officiel géographique](https://www.insee.fr/fr/information/2560452), dernier millésime |
| Codes postaux                   | La Poste, base officielle des codes postaux (data-fair `laposte-hexasmal`, fichier `original`)      |
| Superficies                     | INSEE Melodi `DS_RP_SERIE_HISTORIQUE` (mesure `SUP`, km²)                                           |
| Populations historiques         | INSEE Melodi `DS_POPULATIONS_HISTORIQUES` (prioritaire), INSEE 3698339 (xlsx, 1876-1962)            |
| Naissances, décès               | INSEE Melodi `DS_ETAT_CIVIL_NAIS_COMMUNES`, `DS_ETAT_CIVIL_DECES_COMMUNES`                          |
| Position des mairies            | api.gouv.fr                                                                                         |

Les jeux INSEE Melodi sont décrits par `https://api.insee.fr/melodi/catalog/all` (URL de
téléchargement, millésime) et `https://api.insee.fr/melodi/range/{id}` (colonnes, codes). Le
générateur lit l'URL dans le catalogue au moment du téléchargement et garde l'entrée du catalogue
à côté du fichier (`<id>.catalog.json`). Les autres URLs restent à identifier.

## Docs

- [docs/hosting.md](docs/hosting.md) : Cloudflare (Workers, R2, cache, CORS), publication, vérifications
- [docs/migration.md](docs/migration.md) : reprise de l'ancien site, ce qui reste à migrer
- [docs/ideas.md](docs/ideas.md) : idées mises de côté (pyramide des âges, nos propres tuiles)
- [docs/geography.md](docs/geography.md) : millésimes de géographie, rapprochement des sources, frontières affichées
