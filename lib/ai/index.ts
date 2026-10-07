/**
 * ImpactOS — AI barrel.
 *
 * - `gateway`  — the pre.dev AI client (chat / JSON / status).
 * - `extract`  — PDF / DOCX / XLSX / CSV → text + labelled pages.
 * - `analyze`  — AI-or-heuristic analysis of one document.
 *
 * The persistence adapter (writing analysis results back through the store) is
 * the next slice; it needs the extra store mutators listed in the handoff.
 *
 * SERVER-ONLY: everything here touches the internet, so only import it from
 * route handlers, server actions or server components.
 */

export * from "./text";
export * from "./gateway";
export * from "./extract";
export * from "./analyze";
