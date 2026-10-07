/**
 * ImpactOS — extracted-source storage.
 *
 * A document is parsed once; the *text* is kept on the server next to the
 * database (`$IMPACTOS_DATA_DIR/sources/<id>.json`). That is what makes
 * "re-analyse" possible without asking for the file again, and it keeps large
 * blobs out of SQLite and out of the project folder (so they are never
 * committed). The original bytes are not retained.
 *
 * SERVER-ONLY.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { ExtractedPage } from "../ai/extract";
import { dataDir } from "../repository";

export interface StoredSource {
  documentId: string;
  text: string;
  pages: ExtractedPage[];
  pageCount: number | null;
  sheetNames: string[];
  chars: number;
  savedAt: string;
}

function sourcesDir(): string {
  return path.join(dataDir(), "sources");
}

function sourcePath(documentId: string): string {
  const safe = documentId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return path.join(sourcesDir(), `${safe}.json`);
}

export function writeSource(source: StoredSource): void {
  const file = sourcePath(source.documentId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(source));
  fs.renameSync(tmp, file);
}

export function readSource(documentId: string): StoredSource | null {
  try {
    const file = sourcePath(documentId);
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as StoredSource;
    if (!parsed || typeof parsed.text !== "string" || !Array.isArray(parsed.pages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deleteSource(documentId: string): void {
  try {
    fs.rmSync(sourcePath(documentId), { force: true });
  } catch {
    /* nothing to remove */
  }
}

export function sourceExists(documentId: string): boolean {
  try {
    return fs.existsSync(sourcePath(documentId));
  } catch {
    return false;
  }
}
