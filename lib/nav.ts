/**
 * ImpactOS — the shell's navigation model.
 *
 * One source of truth for the sidebar (and anything else that needs to know
 * what the product's sections are). Icons are typed structurally so this
 * module stays free of any UI-framework import.
 */

import type { ComponentType } from "react";
import {
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export type NavIcon = ComponentType<{ className?: string }>;

export interface NavItem {
  href: string;
  label: string;
  /** One-line explanation, used in the sidebar tooltip / mobile list. */
  description: string;
  icon: NavIcon;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Workspace",
    items: [
      {
        href: "/",
        label: "Dashboard",
        description: "Where the organisation stands right now",
        icon: LayoutDashboard,
      },
      {
        href: "/documents",
        label: "Documents",
        description: "The source evidence behind every number",
        icon: FileText,
      },
      {
        href: "/insights",
        label: "Insights",
        description: "Findings to review and act on",
        icon: Sparkles,
      },
      {
        href: "/projects",
        label: "Projects",
        description: "Programmes, activities and reach",
        icon: FolderKanban,
      },
    ],
  },
  {
    heading: "Output",
    items: [
      {
        href: "/ask",
        label: "Ask ImpactOS",
        description: "Grounded answers with citations",
        icon: MessageSquare,
      },
      {
        href: "/reports",
        label: "Reports",
        description: "Donor-ready narratives, built from evidence",
        icon: ClipboardList,
      },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/** The nav item whose section a pathname belongs to, if any. */
export function activeNavItem(pathname: string | null): NavItem | null {
  if (!pathname) return null;
  let best: NavItem | null = null;
  for (const item of ALL_ITEMS) {
    const matches =
      item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
    if (!matches) continue;
    if (!best || item.href.length > best.href.length) best = item;
  }
  return best;
}

export function isNavItemActive(pathname: string | null, href: string): boolean {
  if (!href || !pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
