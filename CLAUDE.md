# CLAUDE.md

Site statique de cartes de la France (régions, départements, communes) : population, naissances,
décès, densité, superficie, classes de Jenks. Prod : `maps.gaetanraynaud.fr` (front),
`maps-data.gaetanraynaud.fr` (données, R2). Vue d'ensemble et commandes : [README.md](README.md).

## Monorepo

npm workspaces : `shared/` (types et chemins des JSON publiés), `generator/` (production des JSON),
`web/` (React + Vite), plus `scripts/` (publication R2) et `wrangler.toml` (front).

## Conventions

- Node 26, TypeScript exécuté nativement par Node (pas de tsx, pas de build pour `generator/` et
  `scripts/`). Conséquences : imports relatifs avec l'extension `.ts`/`.tsx`, et
  `erasableSyntaxOnly` (pas d'`enum`, de `namespace` ni de paramètres de constructeur publics :
  utiliser des objets `as const`).
- TypeScript strict avec `noUncheckedIndexedAccess`.
- Prettier : pas de point-virgule, guillemets simples, 140 colonnes.
- Code et commentaires en anglais, docs en français.
- Valider avec `npm run typecheck`, `npm test`, `npm run build`.
- Aucune référence à l'ancien projet dans le code (noms de repos, classes, langage). Tout ce qui
  concerne la migration vit dans [docs/migration.md](docs/migration.md).

## Générateur

- `generator/sources/` n'est pas versionné : tout doit se reconstruire de zéro. Chaque source est
  déclarée dans `generator/src/sources/registry.ts` avec sa fonction de téléchargement.
- INSEE : passer par l'API Melodi (`generator/src/sources/melodi.ts`). L'URL du fichier est lue
  dans le catalogue au moment du téléchargement (elle contient le millésime) ; ne pas la coder en
  dur. Catalogue : `https://api.insee.fr/melodi/catalog/all`, colonnes : `/melodi/range/{id}`.
- Mode partiel (défaut) : télécharge les sources absentes, écrit les sorties absentes ou modifiées
  (hash dans `out/.manifest.json`). L'utilisateur rafraîchit une source en supprimant son fichier.
  Mode `--full` : tout retélécharger, tout réécrire.
- Sortie : JSON brut (la compression est faite par le CDN Cloudflare), écriture atomique (tmp
  puis rename), en parallèle. Les chemins
  publiés viennent de `dataPaths` dans `shared/`.
- Jenks : ne pas traduire de code GPL ; utiliser `simple-statistics` (ckmeans) ou réimplémenter
  depuis l'algorithme.
- La population par sexe et âge est volontairement absente : voir [docs/ideas.md](docs/ideas.md).
- Géographie : tout est calculé et affiché dans le dernier COG ; une source en retard est convertie
  avec `v_mvt_commune`. Frontières : tuiles data.gouv.fr. Voir [docs/geography.md](docs/geography.md).

## Front

- Vite + React + TypeScript strict, carte MapLibre GL (react-map-gl ou maplibre-gl direct),
  librairie UI et graphiques au choix. `BrowserRouter` (le fallback SPA est géré par Cloudflare).
- Données lues depuis `VITE_DATA_BASE_URL` : `common.json` et `jenks/*` au démarrage, région,
  département et commune à la demande, un seul `fetch` par fichier, cache mémoire.
- Types et chemins des données importés depuis `@gra-maps/shared`, jamais redéfinis.

## Déploiement

- Front : Worker Cloudflare en assets statiques uniquement (pas de `main`), déployé par
  Cloudflare Workers Builds à chaque push sur `master`. GitHub Actions (`check.yml`) ne fait
  que les vérifications : format, typecheck, tests, build. Détails et
  vérifications : [docs/hosting.md](docs/hosting.md).
- Données : génération (`npm run generate`) et publication (`npm run publish:data`) toujours
  manuelles, en local, jamais dans un build. Les données ne passent jamais par le Worker.
- Secrets : jamais dans le repo, aucun côté GitHub. `.env` racine (ignoré) en local ;
  détail dans [docs/hosting.md](docs/hosting.md#secrets-et-identifiants).
