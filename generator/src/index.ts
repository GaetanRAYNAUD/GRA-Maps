import { parseArgs } from 'node:util'
import { emptyData, type Mode } from './model.ts'
import { ensureSources } from './sources/ensure.ts'
import { steps } from './steps/index.ts'
import { writeOutput } from './write.ts'

async function main() {
  const { values } = parseArgs({ options: { full: { type: 'boolean', default: false } } })
  const mode: Mode = values.full ? 'full' : 'partial'
  console.log(`Generation (${mode})`)

  await ensureSources(mode)

  const data = emptyData()
  for (const step of steps) {
    const start = performance.now()
    await step.run(data)
    console.log(`${step.name} done in ${Math.round(performance.now() - start)} ms`)
  }

  await writeOutput(data, mode)
  console.log('Generation done')
}

try {
  await main()
} catch (e) {
  // Print the whole cause chain: the root cause (HTTP status, network error...) is what matters.
  for (let err: unknown = e, prefix = ''; err !== undefined; prefix = '  caused by: ') {
    console.error(prefix + (err instanceof Error ? err.message : String(err)))
    err = err instanceof Error ? err.cause : undefined
  }
  process.exitCode = 1
}
