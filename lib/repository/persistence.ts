/**
 * ImpactOS — persistence adapters.
 *
 * Two interchangeable backends:
 *
 *   1. `SqlitePersistence` — better-sqlite3, the primary store. Data lives in a
 *      real SQLite file with one table per collection.
 *   2. `JsonPersistence`   — a dependency-free fallback. Same file layout, but
 *      a single JSON document. Used when the native better-sqlite3 binding
 *      cannot load (wrong Node ABI, serverless filesystem, local development
 *      on a machine without build tools).
 *
 * Both are SERVER-ONLY: they touch `node:fs` / better-sqlite3 and must only be
 * imported from route handlers, server components or other server-only modules.
 *
 * The database never lives inside the project folder — it goes to
 * `$IMPACTOS_DATA_DIR` (default: `<tmp>/impactos-data`), so it is never
 * committed and never shipped to GitHub.
 */

import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

import type {
  Activity,
  Beneficiary,
  DocumentCore,
  EvidenceRecord,
  ExtractedFact,
  FindingMetric,
  FindingRecord,
  Organization,
  ProjectCore,
  Report,
  StoreKind,
} from "../types";

/* ------------------------------------------------------------------ */
/* The persisted dataset                                               */
/* ------------------------------------------------------------------ */

export interface DataFile {
  version: number;
  organization: Organization | null;
  previousBeneficiaries: number;
  documents: DocumentCore[];
  projects: ProjectCore[];
  activities: Activity[];
  beneficiaries: Beneficiary[];
  facts: ExtractedFact[];
  findings: FindingRecord[];
  evidence: EvidenceRecord[];
  reports: Report[];
}

export interface Persistence {
  readonly kind: StoreKind;
  /** Where the data lives, for logging / diagnostics. */
  readonly location: string;
  /** Returns null when nothing has been stored yet. */
  load(): DataFile | null;
  save(data: DataFile): void;
  /** Wipe the stored dataset. */
  reset(): void;
}

/* ------------------------------------------------------------------ */
/* Paths                                                               */
/* ------------------------------------------------------------------ */

export function dataDir(): string {
  return process.env.IMPACTOS_DATA_DIR || path.join(os.tmpdir(), "impactos-data");
}

export function sqliteFile(): string {
  return process.env.IMPACTOS_DB_PATH || path.join(dataDir(), "impactos.db");
}

export function jsonFile(): string {
  return process.env.IMPACTOS_JSON_PATH || path.join(dataDir(), "impactos.json");
}

/* ------------------------------------------------------------------ */
/* JSON fallback                                                       */
/* ------------------------------------------------------------------ */

export class JsonPersistence implements Persistence {
  readonly kind = "json" as const;
  readonly location: string;

  constructor(file: string = jsonFile()) {
    this.location = file;
  }

  load(): DataFile | null {
    try {
      if (!fs.existsSync(this.location)) return null;
      const parsed = JSON.parse(fs.readFileSync(this.location, "utf8")) as DataFile;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.documents)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  save(data: DataFile): void {
    fs.mkdirSync(path.dirname(this.location), { recursive: true });
    const tmp = `${this.location}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, this.location);
  }

  reset(): void {
    try {
      fs.rmSync(this.location, { force: true });
    } catch {
      /* nothing to remove */
    }
  }
}

/* ------------------------------------------------------------------ */
/* better-sqlite3                                                      */
/* ------------------------------------------------------------------ */

interface SqliteStatement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  pragma(pragma: string): unknown;
  transaction<T extends (...args: never[]) => unknown>(fn: T): T;
  close(): void;
}

type SqliteConstructor = new (file: string) => SqliteDatabase;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, file_name TEXT NOT NULL, display_name TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, size_bytes INTEGER NOT NULL DEFAULT 0, uploaded_at TEXT NOT NULL, analyzed_at TEXT, page_count INTEGER, summary TEXT, project_id TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', lead TEXT NOT NULL DEFAULT '', budget_kes INTEGER NOT NULL DEFAULT 0, spent_kes INTEGER NOT NULL DEFAULT 0, summary TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, planned_date TEXT NOT NULL DEFAULT '', completed_date TEXT, description TEXT NOT NULL DEFAULT '', participants INTEGER NOT NULL DEFAULT 0, outcome TEXT, location TEXT NOT NULL DEFAULT '', note TEXT);
CREATE TABLE IF NOT EXISTS beneficiaries (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, cohort TEXT NOT NULL DEFAULT '', age INTEGER NOT NULL DEFAULT 0, gender TEXT NOT NULL DEFAULT 'other', location TEXT NOT NULL DEFAULT '', registered_at TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active');
CREATE TABLE IF NOT EXISTS facts (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, project_id TEXT, category TEXT NOT NULL, field TEXT NOT NULL, label TEXT NOT NULL, "value" TEXT NOT NULL, numeric_value REAL, unit TEXT, confidence TEXT NOT NULL, quote TEXT NOT NULL DEFAULT '', locator TEXT NOT NULL DEFAULT '', extracted_at TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, type TEXT NOT NULL, severity TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', confidence TEXT NOT NULL, confidence_reason TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '', project_id TEXT, metrics TEXT NOT NULL DEFAULT '[]', difference TEXT, assessment TEXT NOT NULL DEFAULT '', recommended_action TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, finding_id TEXT NOT NULL, side TEXT NOT NULL, label TEXT NOT NULL, "value" TEXT NOT NULL, unit TEXT, document_id TEXT NOT NULL, quote TEXT NOT NULL DEFAULT '', locator TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, period TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, trust TEXT NOT NULL DEFAULT '{}', sections TEXT NOT NULL DEFAULT '[]', sources TEXT NOT NULL DEFAULT '[]');
`;

const COLUMNS: Record<string, string[]> = {
  documents: ["id", "file_name", "display_name", "type", "status", "size_bytes", "uploaded_at", "analyzed_at", "page_count", "summary", "project_id", "error"],
  projects: ["id", "code", "name", "status", "progress", "description", "location", "start_date", "end_date", "lead", "budget_kes", "spent_kes", "summary"],
  activities: ["id", "project_id", "name", "status", "planned_date", "completed_date", "description", "participants", "outcome", "location", "note"],
  beneficiaries: ["id", "project_id", "name", "cohort", "age", "gender", "location", "registered_at", "status"],
  facts: ["id", "document_id", "project_id", "category", "field", "label", "value", "numeric_value", "unit", "confidence", "quote", "locator", "extracted_at"],
  findings: ["id", "type", "severity", "title", "summary", "detail", "confidence", "confidence_reason", "status", "created_at", "project_id", "metrics", "difference", "assessment", "recommended_action"],
  evidence: ["id", "finding_id", "side", "label", "value", "unit", "document_id", "quote", "locator"],
  reports: ["id", "type", "title", "period", "created_at", "status", "trust", "sections", "sources"],
};

/* -- row coercion helpers ------------------------------------------ */

type Row = Record<string, unknown>;

const text = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const optionalText = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const int = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
const nullableInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
const nullableNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string" || v.length === 0) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

/* -- lazy native module loading ------------------------------------ */

let cachedSqlite: SqliteConstructor | null | undefined;

/**
 * Try to load the native better-sqlite3 binding. We do this lazily (never at
 * module scope) so a missing/broken native module degrades to the JSON store
 * instead of taking the whole server down. A real in-memory round-trip is used
 * as the smoke test, so we only accept a binding that actually works.
 */
export function loadSqliteConstructor(): SqliteConstructor | null {
  if (cachedSqlite !== undefined) return cachedSqlite;
  cachedSqlite = null;

  const attempts: Array<() => unknown> = [
    // 1. A CommonJS-style `require` is present in some server runtimes.
    () => {
      const globalWithRequire = globalThis as { require?: (id: string) => unknown };
      return typeof globalWithRequire.require === "function"
        ? globalWithRequire.require("better-sqlite3")
        : undefined;
    },
    // 2. The ESM way — Node's createRequire.
    () => {
      const req = createRequire(import.meta.url);
      return req("better-sqlite3");
    },
  ];

  for (const attempt of attempts) {
    try {
      const mod = attempt();
      const ctor = (
        typeof mod === "function" ? mod : (mod as { default?: unknown } | undefined)?.default
      ) as SqliteConstructor | undefined;
      if (typeof ctor !== "function") continue;

      const probe = new ctor(":memory:");
      probe.exec("CREATE TABLE probe (a INTEGER)");
      probe.prepare("INSERT INTO probe (a) VALUES (?)").run(1);
      probe.close();

      cachedSqlite = ctor;
      break;
    } catch {
      /* try the next strategy */
    }
  }

  return cachedSqlite;
}

export class SqlitePersistence implements Persistence {
  readonly kind = "sqlite" as const;
  readonly location: string;
  private readonly db: SqliteDatabase;

  constructor(Database: SqliteConstructor, file: string = sqliteFile()) {
    this.location = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    try {
      this.db.pragma("journal_mode = WAL");
    } catch {
      /* WAL is an optimisation, not a requirement */
    }
    this.db.exec(SCHEMA);
  }

  load(): DataFile | null {
    const org = this.db.prepare(`SELECT "value" FROM meta WHERE "key" = 'organization'`).get() as
      | Row
      | undefined;
    if (!org) return null;

    const previous = this.db
      .prepare(`SELECT "value" FROM meta WHERE "key" = 'previous_beneficiaries'`)
      .get() as Row | undefined;

    const rows = (table: string): Row[] =>
      this.db.prepare(`SELECT * FROM ${table}`).all() as Row[];

    return {
      version: 1,
      organization: parseJson<Organization | null>(text(org.value), null),
      previousBeneficiaries: int(previous?.value),
      documents: rows("documents").map((r) => ({
        id: text(r.id),
        fileName: text(r.file_name),
        displayName: text(r.display_name),
        type: text(r.type) as DocumentCore["type"],
        status: text(r.status) as DocumentCore["status"],
        sizeBytes: int(r.size_bytes),
        uploadedAt: text(r.uploaded_at),
        analyzedAt: optionalText(r.analyzed_at),
        pageCount: nullableInt(r.page_count),
        summary: optionalText(r.summary),
        projectId: optionalText(r.project_id),
        error: optionalText(r.error),
      })),
      projects: rows("projects").map((r) => ({
        id: text(r.id),
        code: text(r.code),
        name: text(r.name),
        status: text(r.status) as ProjectCore["status"],
        progress: int(r.progress),
        description: text(r.description),
        location: text(r.location),
        startDate: text(r.start_date),
        endDate: text(r.end_date),
        lead: text(r.lead),
        budgetKes: int(r.budget_kes),
        spentKes: int(r.spent_kes),
        summary: text(r.summary),
      })),
      activities: rows("activities").map((r) => ({
        id: text(r.id),
        projectId: text(r.project_id),
        name: text(r.name),
        status: text(r.status) as Activity["status"],
        plannedDate: text(r.planned_date),
        completedDate: optionalText(r.completed_date),
        description: text(r.description),
        participants: int(r.participants),
        outcome: optionalText(r.outcome),
        location: text(r.location),
        note: optionalText(r.note),
      })),
      beneficiaries: rows("beneficiaries").map((r) => ({
        id: text(r.id),
        projectId: text(r.project_id),
        name: text(r.name),
        cohort: text(r.cohort),
        age: int(r.age),
        gender: text(r.gender) as Beneficiary["gender"],
        location: text(r.location),
        registeredAt: text(r.registered_at),
        status: text(r.status) as Beneficiary["status"],
      })),
      facts: rows("facts").map((r) => ({
        id: text(r.id),
        documentId: text(r.document_id),
        projectId: optionalText(r.project_id),
        category: text(r.category) as ExtractedFact["category"],
        field: text(r.field),
        label: text(r.label),
        value: text(r.value),
        numericValue: nullableNumber(r.numeric_value),
        unit: optionalText(r.unit),
        confidence: text(r.confidence) as ExtractedFact["confidence"],
        quote: text(r.quote),
        locator: text(r.locator),
        extractedAt: text(r.extracted_at),
      })),
      findings: rows("findings").map((r) => ({
        id: text(r.id),
        type: text(r.type) as FindingRecord["type"],
        severity: text(r.severity) as FindingRecord["severity"],
        title: text(r.title),
        summary: text(r.summary),
        detail: text(r.detail),
        confidence: text(r.confidence) as FindingRecord["confidence"],
        confidenceReason: text(r.confidence_reason),
        status: text(r.status) as FindingRecord["status"],
        createdAt: text(r.created_at),
        projectId: optionalText(r.project_id),
        metrics: parseJson<FindingMetric[]>(r.metrics, []),
        difference: parseJson<FindingMetric | null>(r.difference, null),
        assessment: text(r.assessment),
        recommendedAction: text(r.recommended_action),
      })),
      evidence: rows("evidence").map((r) => ({
        id: text(r.id),
        findingId: text(r.finding_id),
        side: (text(r.side) === "b" ? "b" : "a") as EvidenceRecord["side"],
        label: text(r.label),
        value: text(r.value),
        unit: optionalText(r.unit),
        documentId: text(r.document_id),
        quote: text(r.quote),
        locator: text(r.locator),
      })),
      reports: rows("reports").map((r) => ({
        id: text(r.id),
        type: text(r.type) as Report["type"],
        title: text(r.title),
        period: text(r.period),
        createdAt: text(r.created_at),
        status: text(r.status) as Report["status"],
        trust: parseJson<Report["trust"]>(r.trust, {
          enabled: true,
          verified: 0,
          needsReview: 0,
          unsupported: 0,
        }),
        sections: parseJson<Report["sections"]>(r.sections, []),
        sources: parseJson<string[]>(r.sources, []),
      })),
    };
  }

  save(data: DataFile): void {
    const write = this.db.transaction(() => {
      for (const table of Object.keys(COLUMNS)) {
        this.db.exec(`DELETE FROM ${table}`);
      }
      this.db.exec(`DELETE FROM meta`);

      const insert = (table: string, rows: unknown[][]): void => {
        const columns = COLUMNS[table];
        const cols = columns.map((c) => `"${c}"`).join(", ");
        const marks = columns.map(() => "?").join(", ");
        const stmt = this.db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${marks})`);
        for (const row of rows) stmt.run(...row);
      };

      insert(
        "documents",
        data.documents.map((d) => [d.id, d.fileName, d.displayName, d.type, d.status, d.sizeBytes, d.uploadedAt, d.analyzedAt, d.pageCount, d.summary, d.projectId, d.error]),
      );
      insert(
        "projects",
        data.projects.map((p) => [p.id, p.code, p.name, p.status, p.progress, p.description, p.location, p.startDate, p.endDate, p.lead, p.budgetKes, p.spentKes, p.summary]),
      );
      insert(
        "activities",
        data.activities.map((a) => [a.id, a.projectId, a.name, a.status, a.plannedDate, a.completedDate, a.description, a.participants, a.outcome, a.location, a.note]),
      );
      insert(
        "beneficiaries",
        data.beneficiaries.map((b) => [b.id, b.projectId, b.name, b.cohort, b.age, b.gender, b.location, b.registeredAt, b.status]),
      );
      insert(
        "facts",
        data.facts.map((f) => [f.id, f.documentId, f.projectId, f.category, f.field, f.label, f.value, f.numericValue, f.unit, f.confidence, f.quote, f.locator, f.extractedAt]),
      );
      insert(
        "findings",
        data.findings.map((f) => [f.id, f.type, f.severity, f.title, f.summary, f.detail, f.confidence, f.confidenceReason, f.status, f.createdAt, f.projectId, JSON.stringify(f.metrics), f.difference ? JSON.stringify(f.difference) : null, f.assessment, f.recommendedAction]),
      );
      insert(
        "evidence",
        data.evidence.map((e) => [e.id, e.findingId, e.side, e.label, e.value, e.unit, e.documentId, e.quote, e.locator]),
      );
      insert(
        "reports",
        data.reports.map((r) => [r.id, r.type, r.title, r.period, r.createdAt, r.status, JSON.stringify(r.trust), JSON.stringify(r.sections), JSON.stringify(r.sources)]),
      );

      const meta = this.db.prepare(`INSERT INTO meta ("key", "value") VALUES (?, ?)`);
      meta.run("organization", JSON.stringify(data.organization));
      meta.run("previous_beneficiaries", String(data.previousBeneficiaries));
      meta.run("version", String(data.version ?? 1));
    });

    write();
  }

  reset(): void {
    for (const table of Object.keys(COLUMNS)) {
      this.db.exec(`DELETE FROM ${table}`);
    }
    this.db.exec(`DELETE FROM meta`);
  }
}

/**
 * Pick a backend. `IMPACTOS_STORE` can force "sqlite" or "json"; by default we
 * prefer SQLite and silently fall back to JSON when the native binding is
 * unavailable.
 */
export function createPersistence(): Persistence {
  const mode = (process.env.IMPACTOS_STORE || "auto").toLowerCase();

  if (mode === "json") return new JsonPersistence();

  const ctor = loadSqliteConstructor();

  if (!ctor) {
    if (mode === "sqlite") {
      console.warn(
        "[impactos] IMPACTOS_STORE=sqlite but better-sqlite3 could not be loaded — using the JSON store.",
      );
    }
    return new JsonPersistence();
  }

  try {
    return new SqlitePersistence(ctor);
  } catch (error) {
    console.warn("[impactos] SQLite store unavailable, falling back to JSON:", error);
    return new JsonPersistence();
  }
}
