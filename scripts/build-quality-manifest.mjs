import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

function readJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function createQualityManifest() {
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA ?? "local",
    runId: process.env.GITHUB_RUN_ID ?? "local",
    gates: {
      coverage_campaign: process.env.COVERAGE_CAMPAIGN_OUTCOME ?? "unknown",
      coverage_tiered: process.env.COVERAGE_GATE_OUTCOME ?? "unknown",
      runtime_smoke: process.env.RUNTIME_SMOKE_OUTCOME ?? "unknown",
      permission_regression: process.env.PERMISSION_REGRESSION_OUTCOME ?? "unknown",
      route_smoke: process.env.ROUTE_SMOKE_OUTCOME ?? "unknown"
    },
    artifacts: {
      coverageSummary: existsSync("coverage/coverage-summary.json"),
      coverageTiered: existsSync("artifacts/quality/coverage-tiered.json"),
      runtimeSmoke: existsSync("artifacts/quality/runtime-smoke.json"),
      permissionRegression: existsSync("artifacts/quality/permission-regression.json"),
      routeSmoke: existsSync("artifacts/quality/route-smoke.json")
    },
    details: {
      coverageTiered: readJson("artifacts/quality/coverage-tiered.json"),
      runtimeSmoke: readJson("artifacts/quality/runtime-smoke.json"),
      permissionRegression: readJson("artifacts/quality/permission-regression.json"),
      routeSmoke: readJson("artifacts/quality/route-smoke.json")
    }
  };
}

const manifest = createQualityManifest();
mkdirSync("artifacts/quality", { recursive: true });
writeFileSync("artifacts/quality/manifest.json", JSON.stringify(manifest, null, 2));
console.log("Quality artifact manifest generated at artifacts/quality/manifest.json");
