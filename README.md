# osamaps — maps.gaetanraynaud.fr

Cartes de la France (régions, départements, communes) : population, naissances, décès, densité, superficie.

## Structure

| Dossier       | Rôle                                                                                   |
|---------------|----------------------------------------------------------------------------------------|
| `web/`        | Front React + Vite + TypeScript, déployé en assets statiques sur Cloudflare Workers    |
| `generator/`  | Node 26 + TypeScript : génère les JSON à partir de `generator/sources/` vers `out/`    |
| `shared/`     | Types et chemins des fichiers de données, partagés entre `generator/` et `web/`        |
| `scripts/`    | Publication des données vers R2 (`data.gaetanraynaud.fr`)                              |
| `wrangler.toml` | Worker en assets uniquement (aucune invocation de Worker)                            |

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

Le déploiement du front se fait aussi en CI sur push `master`. La génération et la publication
des données restent manuelles.

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

| Source | Producteur |
|--------|------------|
| Régions, départements, communes | INSEE, code officiel géographique |
| Codes postaux | La Poste, base officielle des codes postaux |
| Superficies | Observatoire des territoires |
| Populations historiques | INSEE |
| Naissances, décès | INSEE |
| Position des mairies | api.gouv.fr |
| Population par sexe et âge | INSEE, fichiers `TD_POP1B_<année>` |

Les URLs de téléchargement restent à identifier sur le site de chaque producteur.
