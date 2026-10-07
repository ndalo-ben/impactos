"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { isNavItemActive, NAV_SECTIONS } from "@/lib/nav";

export interface SidebarProps {
  className?: string;
  /** Called after a nav link is activated (the mobile drawer closes with it). */
  onNavigate?: () => void;
  organizationName?: string;
  reportingPeriod?: string;
  openFindings?: number;
}

/**
 * The persistent left rail. Rendered twice by AppShell — fixed on desktop and
 * inside the mobile drawer — so it must stay stateless apart from usePathname.
 */
export function Sidebar({
  className,
  onNavigate,
  organizationName = "Your organisation",
  reportingPeriod,
  openFindings,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full w-full flex-col gap-6 overflow-y-auto px-3 py-5", className)}>
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
          <Radar className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm leading-tight font-semibold tracking-tight">ImpactOS</span>
          <span className="block truncate text-xs leading-tight text-sidebar-muted">
            {organizationName}
          </span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.heading} className="flex flex-col gap-1">
            <p className="px-2 text-[0.6875rem] font-semibold tracking-[0.12em] text-sidebar-muted uppercase">
              {section.heading}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const showCount = item.href === "/insights" && typeof openFindings === "number" && openFindings > 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={item.description}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          active
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-muted group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {showCount ? (
                        <span
                          className="rounded-full bg-warning px-1.5 py-0.5 text-[0.6875rem] font-semibold text-warning-foreground tabular-nums"
                          data-numeric
                        >
                          {openFindings}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="rounded-lg border border-sidebar-border bg-card/60 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Evidence first
        </p>
        <p className="mt-1 text-xs leading-relaxed text-sidebar-muted">
          {reportingPeriod ? "Reporting period " + reportingPeriod : "Every number links back to its source document."}
        </p>
      </div>
    </div>
  );
}
