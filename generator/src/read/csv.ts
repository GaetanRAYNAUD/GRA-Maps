import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'

type CsvOptions = {
  delimiter?: string
  /** Encoding of the file, UTF-8 by default. */
  encoding?: 'utf-8' | 'latin1'
  /** Rewrites the header names, e.g. to drop a leading `#`. */
  header?: (names: string[]) => string[]
}

/** Reads a whole (small) CSV file into objects keyed by the header names. */
export async function readCsv(
  file: string,
  { delimiter = ',', encoding = 'utf-8', header }: CsvOptions = {},
): Promise<Record<string, string>[]> {
  const text = new TextDecoder(encoding).decode(await readFile(file))
  return parse(text, {
    delimiter,
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    columns: header ? (names: string[]) => header(names) : true,
  }) as Record<string, string>[]
}
