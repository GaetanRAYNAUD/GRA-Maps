import { dataPaths, jenksKeys } from '@gra-maps/shared'
import type { Common, Commune, Departement, Jenks, JenksKind, Region } from '@gra-maps/shared'

const baseUrl = (import.meta.env.VITE_DATA_BASE_URL ?? '').replace(/\/$/, '')

/** One request per file for the whole session: the promise itself is cached, failures are evicted. */
const cache = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  const cached = cache.get(path)
  if (cached) return cached as Promise<T>
  const promise = fetch(`${baseUrl}/${path}`).then((response) => {
    if (!response.ok) throw new Error(`${response.status} on ${path}`)
    return response.json() as Promise<T>
  })
  promise.catch(() => cache.delete(path))
  cache.set(path, promise)
  return promise
}

export const loadCommon = () => load<Common>(dataPaths.common())
export const loadRegion = (id: string) => load<Region>(dataPaths.region(id))
export const loadDepartement = (id: string) => load<Departement>(dataPaths.departement(id))
export const loadCommune = (id: string) => load<Commune>(dataPaths.commune(id))
export const loadJenks = <K extends JenksKind>(kind: K) => load<Jenks[(typeof jenksKeys)[K]]>(dataPaths.jenks(kind))
