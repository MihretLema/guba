
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
for (const name of [".env.local", ".env"]) { try { process.loadEnvFile(name); } catch { /* Optional local config. */ } }
// Vinext 0.0.50 caches Windows paths with backslashes. Normalize its cache keys
// before requests are handled, without modifying installed dependencies.

const runtime = dirname(fileURLToPath(import.meta.resolve("vinext")));
if (process.platform === "win32") {
  const { StaticFileCache } = await import(pathToFileURL(join(runtime, "server/static-file-cache.js")).href);
  const original = StaticFileCache.create;
  StaticFileCache.create = async function (...args) {
    const cache = await original.apply(this, args);
    cache.entries = new Map([...cache.entries].map(([key, value]) => [key.replaceAll("\\", "/"), value]).filter(([key]) => key !== "/.vite" && !key.startsWith("/.vite/")));
    return cache;
  };
}
const { startProdServer } = await import(pathToFileURL(join(runtime, "server/prod-server.js")).href);
const index = process.argv.indexOf("--port");
const port = Number(index >= 0 ? process.argv[index + 1] : process.env.PORT || 3000);
await startProdServer({ port, host: process.env.HOST || "127.0.0.1" });
