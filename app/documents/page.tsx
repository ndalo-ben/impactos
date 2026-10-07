import type { Metadata } from "next";
import { DocumentsView } from "@/components/documents/documents-view";
import { getStore } from "@/lib/data";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  const store = getStore();
  return <DocumentsView documents={store.listDocuments()} projects={store.listProjects()} />;
}
