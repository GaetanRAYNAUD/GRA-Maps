# Hébergement

## Front : Cloudflare Workers, assets statiques

`wrangler.toml` sans `main` ni `run_worker_first` : aucune invocation de Worker.
`not_found_handling = "single-page-application"` permet le `BrowserRouter`.

Cache (`web/public/_headers`) : `/` et `/index.html` en `max-age=60`, `/assets/*` (fichiers hashés
par Vite) en `max-age=31536000, immutable`.

Domaine : `maps.gaetanraynaud.fr` (route à ajouter dans `wrangler.toml` au moment de la bascule).

CI (`.github/workflows/deploy.yml`) : build puis `wrangler deploy`, lancée à la main pour l'instant
(onglet Actions de GitHub, « Run workflow »). Le déclenchement sur push `master` est en commentaire
dans le fichier.

## Secrets et identifiants

Rien de secret dans le repo.

| Où                                                      | Quoi                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub, Settings > Secrets and variables > Actions      | Secret `CLOUDFLARE_API_TOKEN` (modèle « Edit Cloudflare Workers ») et `CLOUDFLARE_ACCOUNT_ID` (secret ou variable), lus par la CI                      |
| `.env` à la racine (ignoré par git), en local seulement | Variables de `npm run publish:data` (R2 et purge du cache), chargées par `node --env-file-if-exists=.env`. Aussi lues par wrangler pour `CLOUDFLARE_*` |
| `wrangler login`                                        | Alternative locale au token pour `npm run deploy` (OAuth dans le navigateur)                                                                           |

L'identifiant de compte Cloudflare n'est pas un secret : il peut aussi aller dans `wrangler.toml`
(`account_id = "..."`), ce qui évite de le déclarer partout.

En CLI : `gh secret set CLOUDFLARE_API_TOKEN` puis `gh secret set CLOUDFLARE_ACCOUNT_ID`.

Variables prévues dans `.env` pour la publication (noms à confirmer en écrivant le script) :

```bash
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=          # token R2 (R2 > Manage API tokens), lecture/écriture sur le bucket
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
CLOUDFLARE_ZONE_ID=        # zone gaetanraynaud.fr, pour la purge
CLOUDFLARE_PURGE_TOKEN=    # token dédié, permission Zone > Cache Purge
```

## Données : Cloudflare R2

Bucket public sur le domaine `maps-data.gaetanraynaud.fr` : le CDN sert sans Worker, donc sans quota. Ne
jamais router les données via le Worker. Le front lit `VITE_DATA_BASE_URL`.

- CORS : origines `https://maps.gaetanraynaud.fr` et `http://localhost:5173`, méthode GET.
- Chaque objet est un JSON gzippé, avec `Content-Type: application/json`,
  `Content-Encoding: gzip`, `Cache-Control: public, max-age=300` : le navigateur revalide via
  ETag/304.
- Cache Rule sur `maps-data.gaetanraynaud.fr` : Edge TTL long, purge par préfixe après chaque
  publication. Activer Tiered Cache (gratuit).
- Clés : `common.json`, `regions/{id}.json`, `departements/{id}.json`, `communes/{id}.json`,
  `jenks/{area,population,density,birth,death,birth-per-capita,death-per-capita}.json`.
- Volume attendu : ~35 000 fichiers communes, ≈ 150 Mo compressés au total.

## Publication (`scripts/publish-data.ts`, à écrire)

- `rclone` (backend S3 R2) ou `@aws-sdk/client-s3` : synchroniser `generator/out/` vers le bucket
  par checksum, en posant les trois en-têtes ci-dessus, clé sans l'extension `.gz`.
- Puis purge Cloudflare par préfixe (API, token dédié).
- `common.json` en dernier, pour qu'un visiteur ne voie jamais un `common` qui référence des
  fichiers pas encore publiés.

## À vérifier après le premier déploiement

1. `curl -I https://maps-data.gaetanraynaud.fr/communes/<id>.json` : `Content-Encoding: gzip`,
   `Content-Type: application/json`, ETag présent ; deuxième requête avec `If-None-Match` → 304 ;
   une republication sans changement garde le même ETag.
2. `curl -I https://maps.gaetanraynaud.fr/` et sur une route SPA (ex. `/commune/12345`) : le
   `max-age=60` s'applique-t-il aussi au fallback ? Sinon corriger `_headers`.
3. Les requêtes de données n'apparaissent pas dans les invocations Workers.
4. La taille décompressée du plus gros fichier reste raisonnable pour le navigateur.
5. Si R2 sert mal `Content-Encoding: gzip` : repli sur des `.json.gz` bruts décompressés côté
   client avec `DecompressionStream('gzip')`.
