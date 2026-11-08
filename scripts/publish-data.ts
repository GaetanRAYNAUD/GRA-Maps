/**
 * Publishes generator/out/ to the R2 bucket behind maps-data.gaetanraynaud.fr.
 *
 * - Sync by checksum, only changed objects are uploaded.
 * - Each object: same key as its path in out/ (`.manifest.json` excepted), plain JSON,
 *   Content-Type: application/json, Cache-Control: public, max-age=300. Compression is done
 *   by the Cloudflare CDN.
 * - common.json is uploaded last so it never references files not yet published.
 * - Then purge the Cloudflare cache by prefix (dedicated API token).
 *
 * Manual only (`npm run publish:data`), never run in a build.
 */
console.error('publish-data: not implemented yet')
process.exitCode = 1
