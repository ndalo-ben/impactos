/**
 * ImpactOS — repository barrel.
 *
 * SERVER-ONLY: this pulls in better-sqlite3 / node:fs. Import it from route
 * handlers and server components only — never from a `"use client"` module.
 */

export { getStore, ensureSeeded, resetStore, createStore } from "./store";
export type { Store } from "./store";
export { dataDir, jsonFile, sqliteFile } from "./persistence";
export type { DataFile, Persistence } from "./persistence";
