import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 3000);
const ROOT = normalize(join(process.cwd(), "out"));

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0] || "/");
  const trimmed = clean.replace(/^\/+/, "");
  const base = normalize(join(ROOT, trimmed));
  if (!base.startsWith(ROOT)) return null;

  if (existsSync(base) && statSync(base).isFile()) return base;
  if (existsSync(base) && statSync(base).isDirectory()) {
    const asIndex = join(base, "index.html");
    if (existsSync(asIndex)) return asIndex;
  }

  const asHtml = `${base}.html`;
  if (existsSync(asHtml) && statSync(asHtml).isFile()) return asHtml;

  return null;
}

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  if (ext === ".webmanifest") {
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  } else if (ext === ".png") {
    res.setHeader("Cache-Control", "public, max-age=86400");
  }
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  if (filePath) {
    sendFile(res, filePath);
    return;
  }

  const notFound = join(ROOT, "404.html");
  if (existsSync(notFound)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    createReadStream(notFound).pipe(res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Static server listening on http://0.0.0.0:${PORT}`);
});
