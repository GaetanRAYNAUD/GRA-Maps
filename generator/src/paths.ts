import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

export const SOURCES_DIR = path.join(root, 'sources')
export const OUT_DIR = path.join(root, 'out')
/** Reference output for the parity check (not versioned). */
export const REFERENCE_DIR = path.join(root, 'reference')

export const source = (...parts: string[]) => path.join(SOURCES_DIR, ...parts)
