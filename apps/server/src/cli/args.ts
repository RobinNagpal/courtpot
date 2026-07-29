/**
 * Minimal `--key value` / `--flag` parser shared by the operator CLIs.
 *
 * pnpm forwards the bare `--` separator into argv, so it is skipped rather than
 * treated as a flag whose value is missing.
 */
export function parseArgs(argv: string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key?.startsWith("--") !== true || key === "--") {
      continue;
    }
    const value = argv[i + 1];
    // A bare flag (no value, or followed by another flag) maps to "".
    if (value === undefined || value.startsWith("--")) {
      args.set(key.slice(2), "");
      continue;
    }
    args.set(key.slice(2), value);
    i += 1;
  }
  return args;
}
