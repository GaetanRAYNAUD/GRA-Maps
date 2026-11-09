declare module 'mapshaper' {
  /** Runs mapshaper commands on in-memory files; resolves with the output files by name. */
  function applyCommands(commands: string, input: Record<string, unknown>): Promise<Record<string, string | Uint8Array>>
  const mapshaper: { applyCommands: typeof applyCommands }
  export default mapshaper
}
