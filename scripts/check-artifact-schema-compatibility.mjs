import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SUPPORTED_SCHEMA_VERSIONS = ["1.0.0"];

const governedArtifacts = [
  { gate: "coverage_tiered", path: "artifacts/quality/coverage-tiered.json" },
  { gate: "runtime_smoke", path: "artifacts/quality/runtime-smoke.json" },
  { gate: "permission_regression", path: "artifacts/quality/permission-regression.json" },
  { gate: "route_smoke", path: "artifacts/quality/route-smoke.json" },
  { gate: "manifest", path: "artifacts/quality/manifest.json" }
];

function readArtifact(path) {
  if (!existsSync(path)) {
    return { ok: false, reason: `missing artifact file: ${path}` };
  }
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (error) {
    return { ok: false, reason: `invalid JSON in artifact: ${path}`, details: String(error) };
  }
}

const results = governedArtifacts.map((artifact) => {
  const loaded = readArtifact(artifact.path);
  if (!loaded.ok) {
    return {
      gate: artifact.gate,
      path: artifact.path,
      status: "FAIL",
      expected: SUPPORTED_SCHEMA_VERSIONS,
      actual: null,
      reason: loaded.reason
    };
  }

  const schemaVersion = loaded.value.schemaVersion;
  if (typeof schemaVersion !== "string" || schemaVersion.length === 0) {
    return {
      gate: artifact.gate,
      path: artifact.path,
      status: "FAIL",
      expected: SUPPORTED_SCHEMA_VERSIONS,
      actual: schemaVersion ?? null,
      reason: "missing required schemaVersion field"
    };
  }

  if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    return {
      gate: artifact.gate,
      path: artifact.path,
      status: "FAIL",
      expected: SUPPORTED_SCHEMA_VERSIONS,
      actual: schemaVersion,
      reason: "unsupported schemaVersion"
    };
  }

  return {
    gate: artifact.gate,
    path: artifact.path,
    status: "PASS",
    expected: SUPPORTED_SCHEMA_VERSIONS,
    actual: schemaVersion,
    reason: "compatible"
  };
});

const failed = results.filter((item) => item.status === "FAIL");
const report = {
  schemaVersion: "1.0.0",
  gate: "schema_compatibility",
  generatedAt: new Date().toISOString(),
  status: failed.length ? "FAIL" : "PASS",
  supportedSchemaVersions: SUPPORTED_SCHEMA_VERSIONS,
  results
};

mkdirSync("artifacts/quality", { recursive: true });
writeFileSync("artifacts/quality/schema-compatibility.json", JSON.stringify(report, null, 2));

for (const result of results) {
  const expected = result.expected.join(", ");
  console.log(
    `[${result.status}] ${result.gate}: expected schemaVersion in [${expected}], actual=${result.actual ?? "null"} (${result.reason})`
  );
}

if (failed.length) {
  console.error("Quality gate: FAIL (schema compatibility)");
  process.exit(1);
}

console.log("Quality gate: PASS (schema compatibility)");
