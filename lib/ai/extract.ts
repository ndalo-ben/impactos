/**
 * ImpactOS — document text extraction.
 *
 * Turns the raw bytes of a PDF, DOCX, XLSX or CSV into plain text plus a set of
 * labelled pages/sheets, so the analysis step can quote a figure and say where
 * it came from ("p.3 §Executive summary", `Sheet "Register"`).
 *
 * SERVER-ONLY. The heavy parsers (pdfjs, mammoth, SheetJS) are imported lazily
 * inside each extractor, so one broken engine degrades a single file type to a
 * friendly `ExtractionError` instead of taking the route down.
 */

import type { DocumentType } from "@/lib/types";

/** How much text we hand to the model. Beyond this we keep the head and tail. */
export const MAX_ANALYSIS_CHARS = 16_000;

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "xlsx", "csv"] as const;

export class ExtractionError extends Error {
  readonly code: "unsupported" | "empty" | "corrupt" | "unavailable";

  constructor(code: ExtractionError["code"], message: string) {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
  }
}

export interface ExtractedPage {
  /** Human label used as the evidence locator, e.g. `p.3` or `Sheet "Register"`. */
  label: string;
  text: string;
}

export interface ExtractionResult {
  text: string;
  pages: ExtractedPage[];
  /** Pages for PDF/DOCX, null for spreadsheets/CSV. */
  pageCount: number | null;
  sheetNames: string[];
  chars: number;
}

/* ------------------------------------------------------------------ */
/* Type detection                                                      */
/* ------------------------------------------------------------------ */

const EXTENSION_TYPES: Record<string, DocumentType> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  xls: "xlsx",
  csv: "csv",
};

const MIME_TYPES: Record<string, DocumentType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "text/csv": "csv",
  "application/csv": "csv",
  "text/plain": "csv",
};

export function detectDocumentType(
  fileName: string,
  mimeType?: string | null,
): DocumentType | null {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension && EXTENSION_TYPES[extension]) return EXTENSION_TYPES[extension];

  const mime = mimeType?.toLowerCase().split(";")[0]?.trim();
  if (mime && MIME_TYPES[mime]) return MIME_TYPES[mime];

  return null;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function extractText(
  input: Buffer | Uint8Array,
  type: DocumentType,
): Promise<ExtractionResult> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  switch (type) {
    case "pdf":
      return extractPdf(bytes);
    case "docx":
      return extractDocx(bytes);
    case "xlsx":
    case "csv":
      return extractSheet(bytes, type);
  }
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

interface PdfParser {
  getText(params?: { pageJoiner?: string }): Promise<{
    pages?: Array<{ num: number; text: string }>;
    text?: string;
    total?: number;
  }>;
  destroy(): Promise<void>;
}

type PdfParseCtor = new (options: { data: Uint8Array }) => PdfParser;

async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  // pdf-parse v2 exposes a class (v1's `const pdf = require("pdf-parse")` shape
  // no longer exists) and pulls in pdfjs-dist, so load it lazily.
  let Ctor: PdfParseCtor | null = null;
  try {
    const mod = (await import("pdf-parse")) as unknown as { PDFParse?: PdfParseCtor };
    Ctor = typeof mod.PDFParse === "function" ? mod.PDFParse : null;
  } catch {
    Ctor = null;
  }

  if (!Ctor) {
    throw new ExtractionError("unavailable", "PDF support is unavailable on this server.");
  }

  const parser = new Ctor({ data: bytes });
  try {
    // pageJoiner: "" drops pdf-parse's "-- 1 of 1 --" page markers, which would
    // otherwise pollute every quote the model copies back.
    const result = await parser.getText({ pageJoiner: "" });
    const pages = (result.pages ?? [])
      .map((page) => ({ label: `p.${page.num}`, text: page.text.trim() }))
      .filter((page) => page.text.length > 0);

    const text = pages.map((page) => page.text).join("\n\n").trim();
    if (!text) {
      throw new ExtractionError(
        "empty",
        "No readable text was found in this PDF. It looks like a scanned or image-only document, which needs OCR before it can be analysed.",
      );
    }

    return {
      text,
      pages,
      pageCount: result.total ?? pages.length,
      sheetNames: [],
      chars: text.length,
    };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError("corrupt", `Could not read the PDF: ${errorMessage(error)}`);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ */
/* DOCX                                                                */
/* ------------------------------------------------------------------ */

interface MammothLike {
  extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractionResult> {
  let mammoth: MammothLike;
  try {
    const mod = (await import("mammoth")) as unknown as { default?: MammothLike } & Partial<MammothLike>;
    const resolved = (mod.default ?? mod) as MammothLike;
    if (typeof resolved?.extractRawText !== "function") {
      throw new Error("extractRawText is not a function");
    }
    mammoth = resolved;
  } catch {
    throw new ExtractionError("unavailable", "Word (.docx) support is unavailable on this server.");
  }

  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const raw = (result.value ?? "").replace(/\r\n?/g, "\n").trim();
    if (!raw.trim()) {
      throw new ExtractionError("empty", "No readable text was found in this document.");
    }

    // Word marks explicit page breaks with a form feed.
    const chunks = raw
      .split("\f")
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
    const pages =
      chunks.length > 1
        ? chunks.map((text, index) => ({ label: `p.${index + 1}`, text }))
        : [{ label: "document text", text: raw }];

    const text = pages.map((page) => page.text).join("\n\n");
    return {
      text,
      pages,
      pageCount: chunks.length > 1 ? chunks.length : null,
      sheetNames: [],
      chars: text.length,
    };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError("corrupt", `Could not read the Word document: ${errorMessage(error)}`);
  }
}

/* ------------------------------------------------------------------ */
/* XLSX / CSV                                                          */
/* ------------------------------------------------------------------ */

interface SheetJsLike {
  read(data: Buffer, options: { type: "buffer" }): {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: { sheet_to_csv(sheet: unknown, options?: Record<string, unknown>): string };
}

async function extractSheet(bytes: Uint8Array, type: DocumentType): Promise<ExtractionResult> {
  let xlsx: SheetJsLike;
  try {
    const mod = (await import("xlsx")) as unknown as { default?: SheetJsLike } & Partial<SheetJsLike>;
    const resolved = (mod.default ?? mod) as SheetJsLike;
    if (typeof resolved?.read !== "function") throw new Error("read is not a function");
    xlsx = resolved;
  } catch {
    throw new ExtractionError("unavailable", "Spreadsheet support is unavailable on this server.");
  }

  try {
    const workbook = xlsx.read(Buffer.from(bytes), { type: "buffer" });
    const sheetNames: string[] = [];
    const pages: ExtractedPage[] = [];

    for (const name of workbook.SheetNames ?? []) {
      const sheet = workbook.Sheets?.[name];
      if (!sheet) continue;
      const csv = xlsx.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
      if (!csv) continue;
      pages.push({ label: `Sheet "${name}"`, text: csv });
      sheetNames.push(name);
    }

    if (pages.length === 0) {
      throw new ExtractionError(
        "empty",
        type === "csv" ? "The CSV file has no readable rows." : "The spreadsheet has no readable rows.",
      );
    }

    const text = pages.map((page) => `# ${page.label}\n${page.text}`).join("\n\n").trim();
    return { text, pages, pageCount: null, sheetNames, chars: text.length };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      "corrupt",
      `Could not read the ${type === "csv" ? "CSV" : "spreadsheet"}: ${errorMessage(error)}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
