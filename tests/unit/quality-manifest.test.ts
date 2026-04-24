import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scriptPath = join(process.cwd(), "scripts/build-quality-manifest.mjs");

describe("quality artifact manifest details", () => {
  it("includes runtime smoke and permission regression details", () => {
    const workdir = mkdtempSync(join(tmpdir(), "quality-manifest-"));
    try {
      mkdirSync(join(workdir, "artifacts/quality"), { recursive: true });
      mkdirSync(join(workdir, "coverage"), { recursive: true });

      writeFileSync(join(workdir, "coverage/coverage-summary.json"), JSON.stringify({ total: {} }, null, 2));
      writeFileSync(join(workdir, "artifacts/quality/coverage-tiered.json"), JSON.stringify({ status: "PASS" }, null, 2));
      writeFileSync(
        join(workdir, "artifacts/quality/runtime-smoke.json"),
        JSON.stringify({ numPassedTests: 3, status: "passed" }, null, 2)
      );
      writeFileSync(
        join(workdir, "artifacts/quality/permission-regression.json"),
        JSON.stringify({ numPassedTests: 5, status: "passed" }, null, 2)
      );
      writeFileSync(join(workdir, "artifacts/quality/route-smoke.json"), JSON.stringify({ status: "PASS" }, null, 2));

      execFileSync("node", [scriptPath], {
        cwd: workdir,
        encoding: "utf8",
        env: {
          ...process.env,
          RUNTIME_SMOKE_OUTCOME: "success",
          PERMISSION_REGRESSION_OUTCOME: "success"
        }
      });

      const manifest = JSON.parse(readFileSync(join(workdir, "artifacts/quality/manifest.json"), "utf8"));
      expect(manifest.details.runtimeSmoke).toEqual({ numPassedTests: 3, status: "passed" });
      expect(manifest.details.permissionRegression).toEqual({ numPassedTests: 5, status: "passed" });
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});
