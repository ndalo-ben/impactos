/**
 * ImpactOS — convenient single entry point for the data layer.
 *
 * `import { getStore } from "@/lib/data"` gives you the whole repository, and
 * `import type { Finding, Document } from "@/lib/data"` gives you the domain
 * types, from one path.
 *
 * SERVER-ONLY (it re-exports the repository, which uses better-sqlite3).
 * Client components should import types from `@/lib/types` instead.
 */

export * from "./types";
export { getStore, ensureSeeded, resetStore, createStore } from "./repository";
export type { Store } from "./repository";
