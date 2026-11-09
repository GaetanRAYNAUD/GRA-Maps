import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

/**
 * MapLibre names its worker file in a way the bundler cannot follow, so the build emits it
 * (`?worker&url`). The dev server would inject its client into that worker, which then never
 * starts: in development the untouched source runs from a blob instead.
 */
export const workerReady: Promise<void> = import.meta.env.DEV
  ? import('maplibre-gl/dist/maplibre-gl-worker.mjs?raw').then(({ default: source }) => {
      setWorkerUrl(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })))
    })
  : Promise.resolve(setWorkerUrl(workerUrl))
