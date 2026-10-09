import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../out");
const port = Number(process.argv[2] || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };

await stat(resolve(root, "index.html")).catch(() => { throw new Error("Build the website first with npm run build."); });

createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname); }
  catch { response.writeHead(400); response.end("Bad request"); return; }
  let file = resolve(root, `.${pathname}`);
  if (!file.startsWith(root + sep) && file !== root) { response.writeHead(403); response.end("Forbidden"); return; }
  try {
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith("/")) { response.writeHead(301, { Location: `${pathname}/${new URL(request.url, "http://localhost").search}` }); response.end(); return; }
      file = resolve(file, "index.html");
    }
    const data = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(resolve(root, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log(`Juggle Dude preview: http://localhost:${port}`));
