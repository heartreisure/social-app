import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const routeChecks = [
  {
    route: "/auth",
    file: "out/auth/index.html",
    markers: ["Create your account"]
  },
  {
    route: "/feed",
    file: "out/feed/index.html",
    markers: ["Vibe Feed"]
  },
  {
    route: "/profile",
    file: "out/profile/index.html",
    markers: ["Loading profile..."]
  },
  {
    route: "/admin",
    file: "out/admin/index.html",
    markers: ["Loading moderation panel..."]
  }
];

let hasFailure = false;
const results = [];

for (const check of routeChecks) {
  const fullPath = join(process.cwd(), check.file);
  if (!existsSync(fullPath)) {
    console.error(`SMOKE ${check.route} ... FAIL (missing file: ${check.file})`);
    hasFailure = true;
    results.push({
      route: check.route,
      status: "FAIL",
      reason: `missing file: ${check.file}`
    });
    continue;
  }

  const html = readFileSync(fullPath, "utf8");
  const missingMarker = check.markers.find((marker) => !html.includes(marker));
  if (missingMarker) {
    console.error(`SMOKE ${check.route} ... FAIL (missing marker: ${missingMarker})`);
    hasFailure = true;
    results.push({
      route: check.route,
      status: "FAIL",
      reason: `missing marker: ${missingMarker}`
    });
    continue;
  }

  console.log(`SMOKE ${check.route} ... PASS`);
  results.push({
    route: check.route,
    status: "PASS",
    reason: "all markers found"
  });
}

mkdirSync("artifacts/quality", { recursive: true });
writeFileSync(
  "artifacts/quality/route-smoke.json",
  JSON.stringify(
    {
      schemaVersion: "1.0.0",
      gate: "route_smoke",
      generatedAt: new Date().toISOString(),
      status: hasFailure ? "FAIL" : "PASS",
      results
    },
    null,
    2
  )
);

if (hasFailure) {
  process.exit(1);
}
