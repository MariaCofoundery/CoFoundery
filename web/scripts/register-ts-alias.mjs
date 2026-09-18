import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(projectRoot, "src");
const SUPPORTED_SUFFIXES = [".ts", ".tsx", ".js", ".mjs", ".json"];

function resolveExistingFile(basePath) {
  const directMatch = SUPPORTED_SUFFIXES.find((suffix) => fs.existsSync(`${basePath}${suffix}`));
  if (directMatch) {
    return `${basePath}${directMatch}`;
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  const indexMatch = SUPPORTED_SUFFIXES.find((suffix) =>
    fs.existsSync(path.join(basePath, `index${suffix}`))
  );

  if (indexMatch) {
    return path.join(basePath, `index${indexMatch}`);
  }

  return null;
}

/**
 * `server-only` und `client-only` sind Marker ohne Paket: Next.js loest sie
 * beim Bauen selbst auf, in node_modules liegt nichts. Ein Datenmodul mit
 * `import "server-only"` liess sich deshalb im Test gar nicht laden - genau
 * die Module, in denen die Abfragen stehen, waren nur ueber Quelltext-Greps
 * pruefbar. Hier werden sie zum leeren Modul, wie im Server-Build auch.
 */
const MARKER_MODULES = new Set(["server-only", "client-only"]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (MARKER_MODULES.has(specifier)) {
      return { shortCircuit: true, url: "data:text/javascript,export {};" };
    }

    if (specifier.startsWith("@/")) {
      const candidatePath = resolveExistingFile(path.join(srcRoot, specifier.slice(2)));
      if (!candidatePath) {
        throw new Error(`unresolved_ts_alias:${specifier}`);
      }

      return {
        shortCircuit: true,
        url: pathToFileURL(candidatePath).href,
      };
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json")) {
      const source = fs.readFileSync(fileURLToPath(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${source.trim()};`,
      };
    }

    return nextLoad(url, context);
  },
});
