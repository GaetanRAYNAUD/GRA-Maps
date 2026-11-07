/**
 * Publishes generator/out/ to the R2 bucket behind maps-data.gaetanraynaud.fr.
 *
 * - Sync by checksum, only changed objects are uploaded.
 * - Each object: key without the `.gz` suffix, Content-Type: application/json,
 *   Content-Encoding: gzip, Cache-Control: public, max-age=300.
 * - common.json is uploaded last so it never references files not yet published.
 * - Then purge the Cloudflare cache by prefix (dedicated API token).
 *
 * Manual only (`npm run publish:data`), never run in CI.
 */
console.error('publish-data: not implemented yet')
process.exitCode = 1
