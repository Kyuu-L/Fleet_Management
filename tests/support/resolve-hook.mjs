// Node module-customization resolve hook used only by the API integration
// tests. It does two things a bundler normally handles for us:
//  - maps the "@/..." tsconfig path alias to real files on disk
//  - redirects "cloudflare:workers" (only resolvable inside workerd) to
//    tests/support/mock-cloudflare-workers.mjs
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const cloudflareWorkersMock = pathToFileURL(path.join(projectRoot, "tests/support/mock-cloudflare-workers.mjs")).href;

const extensions = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function resolveAliasPath(base) {
  for (const ext of extensions) {
    if (existsSync(base + ext)) return base + ext;
  }
  for (const ext of extensions) {
    const indexed = path.join(base, "index" + ext);
    if (existsSync(indexed)) return indexed;
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return { url: cloudflareWorkersMock, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const resolved = resolveAliasPath(path.join(projectRoot, specifier.slice(2)));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = resolveAliasPath(path.join(parentDir, specifier));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
