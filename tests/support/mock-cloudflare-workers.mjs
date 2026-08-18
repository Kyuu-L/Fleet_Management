// Stand-in for the `cloudflare:workers` module, which only resolves inside
// the Workers runtime (workerd/miniflare). API integration tests run under
// plain Node, so `tests/support/resolve-hook.mjs` redirects any
// `import ... from "cloudflare:workers"` to this file instead. Tests mutate
// `env.DB` directly (see `tests/support/d1-sqlite.mjs`) to swap in a fresh
// in-memory database per test.
export const env = {};
