import { existsSync, readFileSync, writeFileSync } from "node:fs";

function parseArgs(argv) {
  const args = { file: "", gate: "", schemaVersion: "1.0.0" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!value) {
      continue;
    }
    if (key === "--file") {
      args.file = value;
      i += 1;
    } else if (key === "--gate") {
      args.gate = value;
      i += 1;
    } else if (key === "--schema") {
      args.schemaVersion = value;
      i += 1;
    }
  }
  return args;
}

const { file, gate, schemaVersion } = parseArgs(process.argv.slice(2));

if (!file || !gate) {
  console.error("Usage: node scripts/annotate-quality-artifact.mjs --file <path> --gate <name> [--schema <version>]");
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`Artifact file not found: ${file}`);
  process.exit(1);
}

const artifact = JSON.parse(readFileSync(file, "utf8"));
const enriched = {
  schemaVersion,
  gate,
  ...artifact
};

writeFileSync(file, JSON.stringify(enriched, null, 2));
console.log(`Annotated artifact ${file} with schemaVersion=${schemaVersion} gate=${gate}`);
