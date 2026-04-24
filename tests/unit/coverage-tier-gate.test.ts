import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const scriptPath = join(process.cwd(), "scripts/check-coverage-threshold.mjs");

function writeFixtureFiles(root: string, lowTierEntries: string[]) {
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "coverage"), { recursive: true });
  const summary = {
    total: {
      lines: { total: 100, covered: 70, skipped: 0, pct: 70 }
    },
    "/tmp/lib/moderation-policy.ts": {
      lines: { total: 10, covered: 10, skipped: 0, pct: 100 }
    },
    "/tmp/lib/runtime-config.ts": {
      lines: { total: 20, covered: 13, skipped: 0, pct: 65 }
    },
    "/tmp/lib/supabase-auth.ts": {
      lines: { total: 70, covered: 47, skipped: 0, pct: 67 }
    }
  };
  writeFileSync(join(root, "coverage/coverage-summary.json"), JSON.stringify(summary));
  writeFileSync(
    join(root, "config/coverage-tiers.json"),
    JSON.stringify(
      {
        thresholds: { critical: 75, standard: 60, low: 40 },
        tiers: {
          critical: ["lib/moderation-policy.ts"],
          standard: ["lib/runtime-config.ts", "lib/supabase-auth.ts"],
          low: lowTierEntries
        }
      },
      null,
      2
    )
  );
}

describe("coverage tier gate", () => {
  it("fails when low tier mapping is empty", () => {
    const workdir = mkdtempSync(join(tmpdir(), "coverage-tier-empty-"));
    try {
      writeFixtureFiles(workdir, []);
      expect(() => execFileSync("node", [scriptPath], { cwd: workdir, encoding: "utf8" })).toThrow();
      const report = JSON.parse(readFileSync(join(workdir, "artifacts/quality/coverage-tiered.json"), "utf8"));
      expect(report.status).toBe("FAIL");
      expect(report.evaluations.find((item: { tierName: string }) => item.tierName === "low")?.reason).toContain(
        "required"
      );
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });

  it("passes when low tier mapping is present", () => {
    const workdir = mkdtempSync(join(tmpdir(), "coverage-tier-mapped-"));
    try {
      writeFixtureFiles(workdir, ["lib/runtime-config.ts"]);
      execFileSync("node", [scriptPath], { cwd: workdir, encoding: "utf8" });
      const report = JSON.parse(readFileSync(join(workdir, "artifacts/quality/coverage-tiered.json"), "utf8"));
      expect(report.status).toBe("PASS");
      expect(report.evaluations.find((item: { tierName: string }) => item.tierName === "low")?.status).toBe(
        "PASS"
      );
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});
