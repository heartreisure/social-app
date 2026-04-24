import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

function readCoverageSummary() {
  const summaryPath = "coverage/coverage-summary.json";
  if (!existsSync(summaryPath)) {
    throw new Error(`Coverage summary file not found: ${summaryPath}`);
  }
  return JSON.parse(readFileSync(summaryPath, "utf8"));
}

function readTierConfig() {
  const configPath = "config/coverage-tiers.json";
  if (!existsSync(configPath)) {
    throw new Error(`Coverage tier config missing: ${configPath}`);
  }
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function getFileLinesPct(summary, filePath) {
  const exact = summary[filePath];
  const bySuffixKey = Object.keys(summary).find((key) => key.endsWith(`/${filePath}`));
  const fileSummary = exact ?? (bySuffixKey ? summary[bySuffixKey] : undefined);
  const pct = fileSummary?.lines?.pct;
  if (typeof pct !== "number") {
    throw new Error(`Coverage summary missing lines.pct for ${filePath}`);
  }
  return pct;
}

function evaluateTier(summary, tierName, filePaths, threshold) {
  if (!Array.isArray(filePaths)) {
    throw new Error(`Tier "${tierName}" must be an array of file paths.`);
  }

  if (filePaths.length === 0) {
    if (tierName === "low") {
      return {
        tierName,
        threshold,
        covered: null,
        files: [],
        status: "FAIL",
        reason: "low-tier mapping is required and cannot be empty"
      };
    }
    return {
      tierName,
      threshold,
      covered: null,
      files: [],
      status: "PASS",
      reason: "no mapped files"
    };
  }

  const fileScores = filePaths.map((filePath) => ({
    filePath,
    pct: getFileLinesPct(summary, filePath)
  }));
  const average = fileScores.reduce((acc, item) => acc + item.pct, 0) / fileScores.length;
  const status = average >= threshold ? "PASS" : "FAIL";

  return {
    tierName,
    threshold,
    covered: Number(average.toFixed(2)),
    files: fileScores.map((item) => ({
      filePath: item.filePath,
      pct: Number(item.pct.toFixed(2))
    })),
    status
  };
}

const summary = readCoverageSummary();
const tierConfig = readTierConfig();
const thresholds = tierConfig.thresholds ?? {};
const tiers = tierConfig.tiers ?? {};
const tierNames = Object.keys(thresholds);

if (!tierNames.length) {
  throw new Error("Coverage tier config has no thresholds.");
}

const evaluations = tierNames.map((tierName) =>
  evaluateTier(summary, tierName, tiers[tierName] ?? [], thresholds[tierName])
);

for (const result of evaluations) {
  if (result.covered === null) {
    console.log(
      `[${result.status}] ${result.tierName}: ${result.reason} (threshold ${result.threshold.toFixed(2)}%)`
    );
    continue;
  }
  console.log(
    `[${result.status}] ${result.tierName}: ${result.covered.toFixed(2)}% (threshold ${result.threshold.toFixed(2)}%)`
  );
}

const failed = evaluations.filter((result) => result.status === "FAIL");
mkdirSync("artifacts/quality", { recursive: true });
writeFileSync(
  "artifacts/quality/coverage-tiered.json",
  JSON.stringify(
    {
      schemaVersion: "1.0.0",
      gate: "coverage_tiered",
      generatedAt: new Date().toISOString(),
      status: failed.length ? "FAIL" : "PASS",
      evaluations
    },
    null,
    2
  )
);

if (failed.length) {
  console.error("Quality gate: FAIL (tiered coverage)");
  process.exit(1);
}

console.log("Quality gate: PASS (tiered coverage)");
