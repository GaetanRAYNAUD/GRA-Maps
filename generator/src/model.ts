import type { Commune, Departement, Region } from '@osamaps/shared'

/**
 * - partial: download only missing sources, write only output files that are
 *   missing or whose content changed;
 * - full: download every source again and rewrite every output file.
 */
export type Mode = 'partial' | 'full'

/** In-memory state shared by every pipeline step. */
export type Data = {
  regions: Map<string, Region>
  departements: Map<string, Departement>
  communes: Map<string, Commune>
}

export const emptyData = (): Data => ({
  regions: new Map(),
  departements: new Map(),
  communes: new Map(),
})

export type Step = {
  name: string
  run: (data: Data) => Promise<void> | void
}
