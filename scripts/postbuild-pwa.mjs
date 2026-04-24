import { cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";

function copy(src, dest) {
  const source = join(OUT, src);
  const target = join(OUT, dest);
  if (!existsSync(source)) {
    console.warn(`[postbuild-pwa] missing source: ${source}`);
    return;
  }
  cpSync(source, target);
  console.log(`[postbuild-pwa] ${source} -> ${target}`);
}

copy("icon", "icon.png");
copy("apple-icon", "apple-icon.png");
copy("apple-icon", "apple-touch-icon.png");
copy("icon-large", "icon-512.png");

const serveConfig = {
  public: ".",
  cleanUrls: false,
  trailingSlash: true,
  renderSingle: true,
  directoryListing: false,
  rewrites: [],
  headers: [
    {
      source: "**/*.webmanifest",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" }
      ]
    },
    {
      source: "**/*.png",
      headers: [
        { key: "Content-Type", value: "image/png" },
        { key: "Cache-Control", value: "public, max-age=86400" }
      ]
    },
    {
      source: "icon",
      headers: [
        { key: "Content-Type", value: "image/png" },
        { key: "Cache-Control", value: "public, max-age=86400" }
      ]
    },
    {
      source: "apple-icon",
      headers: [
        { key: "Content-Type", value: "image/png" },
        { key: "Cache-Control", value: "public, max-age=86400" }
      ]
    },
    {
      source: "icon-large",
      headers: [
        { key: "Content-Type", value: "image/png" },
        { key: "Cache-Control", value: "public, max-age=86400" }
      ]
    }
  ]
};

writeFileSync(join(OUT, "serve.json"), JSON.stringify(serveConfig, null, 2));
console.log("[postbuild-pwa] wrote out/serve.json");
