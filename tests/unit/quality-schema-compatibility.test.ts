import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scriptPath = join(process.cwd(), "scripts/check-artifact-schema-compatibility.mjs");

function seedArtifacts(root: string, schemaVersionByFile: Record<string, string | null>) {
  mkdirSync(join(root, "artifacts/quality"), { recursive: true });
  const entries = [
    ["coverage-tiered.json", "coverage_tiered"],
    ["runtime-smoke.json", "runtime_smoke"],
    ["permission-regression.json", "permission_regression"],
    ["route-smoke.json", "route_smoke"],
    ["manifest.json", "manifest"]
  ] as const;

  for (const [fileName, gate] of entries) {
    const schema = schemaVersionByFile[fileName];
    const payload: Record<string, unknown> = { gate, status: "PASS" };
    if (schema !== null) {
      payload.schemaVersion = schema;
    }
    writeFileSync(join(root, "artifacts/quality", fileName), JSON.stringify(payload, null, 2));
  }
}

describe("quality artifact schema compatibility gate", () => {
  it("passes when all governed artifacts use supported schema version", () => {
    const workdir = mkdtempSync(join(tmpdir(), "schema-compat-pass-"));
    try {
      seedArtifacts(workdir, {
        "coverage-tiered.json": "1.0.0",
        "runtime-smoke.json": "1.0.0",
        "permission-regression.json": "1.0.0",
        "route-smoke.json": "1.0.0",
        "manifest.json": "1.0.0"
      });

      execFileSync("node", [scriptPath], { cwd: workdir, encoding: "utf8" });
      const report = JSON.parse(readFileSync(join(workdir, "artifacts/quality/schema-compatibility.json"), "utf8"));
      expect(report.status).toBe("PASS");
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });

  it("fails when schemaVersion is unsupported", () => {
    const workdir = mkdtempSync(join(tmpdir(), "schema-compat-unsupported-"));
    try {
      seedArtifacts(workdir, {
        "coverage-tiered.json": "2.0.0",
        "runtime-smoke.json": "1.0.0",
        "permission-regression.json": "1.0.0",
        "route-smoke.json": "1.0.0",
        "manifest.json": "1.0.0"
      });

      expect(() => execFileSync("node", [scriptPath], { cwd: workdir, encoding: "utf8" })).toThrow();
      const report = JSON.parse(readFileSync(join(workdir, "artifacts/quality/schema-compatibility.json"), "utf8"));
      expect(report.status).toBe("FAIL");
      expect(report.results.find((item: { gate: string }) => item.gate === "coverage_tiered")?.reason).toContain(
        "unsupported"
      );
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });

  it("fails when schemaVersion field is missing", () => {
    const workdir = mkdtempSync(join(tmpdir(), "schema-compat-missing-"));
    try {
      seedArtifacts(workdir, {
        "coverage-tiered.json": "1.0.0",
        "runtime-smoke.json": null,
        "permission-regression.json": "1.0.0",
        "route-smoke.json": "1.0.0",
        "manifest.json": "1.0.0"
      });

      expect(() => execFileSync("node", [scriptPath], { cwd: workdir, encoding: "utf8" })).toThrow();
      const report = JSON.parse(readFileSync(join(workdir, "artifacts/quality/schema-compatibility.json"), "utf8"));
      expect(report.status).toBe("FAIL");
      expect(report.results.find((item: { gate: string }) => item.gate === "runtime_smoke")?.reason).toContain(
        "missing required schemaVersion"
      );
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});
