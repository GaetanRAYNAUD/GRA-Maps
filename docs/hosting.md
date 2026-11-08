# Hébergement

## Front : Cloudflare Workers, assets statiques

`wrangler.toml` sans `main` ni `run_worker_first` : aucune invocation de Worker.
`not_found_handling = "single-page-application"` permet le `BrowserRouter`.

Cache (`web/public/_headers`) : `/` et `/index.html` en `max-age=60`, `/assets/*` (fichiers hashés
par Vite) en `max-age=31536000, immutable`.

Domaine : `maps.gaetanraynaud.fr` (route à ajouter dans `wrangler.toml` au moment de la bascule).

## Déploiement du front : Workers Builds

Cloudflare (Workers Builds, l'intégration Git des Workers) clone le repo, build et déploie à
chaque push sur `master` ; GitHub ne déploie rien. Logs et historique dans le dashboard Cloudflare, Worker
`gra-maps` > Settings > Builds.

Réglages du Worker :

| Champ             | Valeur                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| Repository        | `GaetanRAYNAUD/GRA-Maps`                                                            |
| Production branch | `master`                                                                            |
| Root directory    | `/`                                                                                 |
| Build command     | `npm run build`                                                                     |
| Deploy command    | `npx wrangler deploy`                                                               |
| Nom du Worker     | `gra-maps` (doit être identique au `name` de `wrangler.toml`)                       |
| Build watch paths | `web/*`, `shared/*`, `wrangler.toml`, `package.json`, `package-lock.json`, `.nvmrc` |

Version de Node : l'image de build utilise Node 24 par défaut, mais lit `.nvmrc` (ou la variable
`NODE_VERSION`), donc le build tourne en Node 26 sans réglage
([doc](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/#overriding-default-versions)).

Les branches autres que `master` peuvent produire des previews (option « non-production branch
builds »). Les watch paths évitent de redéployer le front pour un commit qui ne touche que le
générateur ou la doc.

Déploiement à la main depuis le poste : `npm run deploy` (après `wrangler login`).

## Secrets et identifiants

Rien de secret dans le repo, et aucun secret côté GitHub : Workers Builds s'authentifie avec
l'intégration GitHub de Cloudflare.

| Où                                                      | Quoi                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.env` à la racine (ignoré par git), en local seulement | Variables de `npm run publish:data` (R2 et purge du cache), chargées par `node --env-file-if-exists=.env`. Aussi lues par wrangler pour `CLOUDFLARE_*` |
| `wrangler login`                                        | Authentification locale pour `npm run deploy` (OAuth dans le navigateur), à la place d'un `CLOUDFLARE_API_TOKEN`                                       |

Modèle du `.env` : [`.env.example`](../.env.example) à la racine.

L'identifiant de compte Cloudflare n'est pas un secret : il peut aussi aller dans `wrangler.toml`
(`account_id = "..."`).

Variables du `.env` pour la publication (lues par `scripts/publish-data.ts`) :

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
- Chaque objet est du JSON brut, avec `Content-Type: application/json` et
  `Cache-Control: public, max-age=300` : le navigateur revalide via ETag/304.
- Compression : faite par le CDN Cloudflare à la volée (gzip ou brotli selon le navigateur),
  le JSON étant un type compressible par défaut. Une Compression Rule peut forcer brotli. On ne
  stocke pas de gzip : Cloudflare ne recompresserait pas en brotli, et `Content-Encoding` sur
  les objets ajoute un risque de mauvais service.
- Cache Rule `maps-data` (en place) : filtre `http.host eq "maps-data.gaetanraynaud.fr"`,
  « Eligible for cache » (sans elle, Cloudflare ne met pas les `.json` en cache), Edge TTL
  « Ignore cache-control header » 1 mois. Pas de Browser TTL dans la règle (2 h minimum en
  offre gratuite, trop long après une publication) : le navigateur suit le `Cache-Control:
max-age=300` posé sur chaque objet par le script de publication. Un objet publié sans cet
  en-tête prendrait le Browser Cache TTL de la zone (4 h par défaut). Cache vidé après chaque
  publication. Tiered Cache activé.
- Clés : `common.json`, `regions/{id}.json`, `departements/{id}.json`, `communes/{id}.json`,
  `jenks/{area,population,density,birth,death,birth-per-capita,death-per-capita}.json`.
- Volume (08/11/2026) : 34 863 fichiers, 406 Mo de JSON brut stocké ; environ 114 Mo en gzip et
  70 Mo en brotli transférés si tout était téléchargé.

## Publication (`npm run publish:data`)

`scripts/publish-data.ts`, avec `@aws-sdk/client-s3` sur l'API S3 de R2. Lancer d'abord avec
`npm run publish:data -- --dry-run` : liste ce qui serait envoyé et supprimé, n'écrit rien (ne
demande que les variables R2).

1. Compare chaque fichier de `generator/out/` au bucket par MD5 (l'ETag que R2 donne aux envois
   en une partie) : seuls les fichiers nouveaux ou modifiés partent.
2. Clé identique au chemin dans `out/` (sauf `.manifest.json` et les `.tmp`), avec les deux
   en-têtes ci-dessus.
3. `common.json` en dernier, pour qu'un visiteur ne voie jamais un `common` qui référence des
   fichiers pas encore publiés ; les objets qui ne sont plus produits sont supprimés ensuite.
4. Purge du cache de `maps-data.gaetanraynaud.fr` (purge par hôte, API Cloudflare), seulement si
   quelque chose a changé. À vérifier au premier lancement : si l'offre refuse la purge par
   hôte, passer à une purge par URL des fichiers modifiés, ou purger toute la zone.

`--only <préfixe>` limite la synchro (envois et suppressions) aux clés qui commencent par ce
préfixe, par exemple `--only regions/` ; `common.json` n'est alors pas touché.

Garde-fous : le script refuse de supprimer plus de 5 % du bucket sans `--allow-deletes` (un
`out/` incomplet effacerait les données publiées). Si la purge échoue après l'envoi, la
corriger puis relancer avec `--purge` : sans changement à envoyer, le script ne purge pas.

Variables du `.env` : `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY` (token R2 « Object Read & Write » limité au bucket), `CLOUDFLARE_ZONE_ID`
(zone `gaetanraynaud.fr`) et `CLOUDFLARE_PURGE_TOKEN` (token API avec la seule permission
Zone > Cache Purge).

## Vérifications

Les données ont été vérifiées le 08/11/2026, après la première publication complète :

- `curl -I -H 'Accept-Encoding: br, gzip' https://maps-data.gaetanraynaud.fr/communes/<id>.json` :
  `Content-Encoding: br`, `Content-Type: application/json`, `Cache-Control: public, max-age=300`,
  CORS pour `https://maps.gaetanraynaud.fr`, ETag (faible après compression) ; deuxième requête
  `cf-cache-status: HIT` ; `If-None-Match` (ETag fort ou faible) → 304.
- Un `--dry-run` après publication annonce 0 fichier à envoyer : l'ETag de R2 est bien le MD5.
- Contenu servi identique aux fichiers de `out/` (MD5 comparés sur un échantillon).
- Plus gros fichier : `jenks/population.json`, 2,2 Mo transférés en brotli (à revoir pour le
  front, voir [migration.md](migration.md)).
- Sans `Accept-Encoding`, le fichier arrive non compressé (normal).

Reste à vérifier au premier déploiement du front :

1. `curl -I https://maps.gaetanraynaud.fr/` et sur une route SPA (ex. `/commune/12345`) : le
   `max-age=60` s'applique-t-il aussi au fallback ? Sinon corriger `_headers`.
2. Les requêtes de données n'apparaissent pas dans les invocations Workers.
