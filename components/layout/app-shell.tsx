"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Header, type HeaderAiStatus } from "./header";
import { Sidebar } from "./sidebar";

/** Lets a nested <AppShell> collapse to its children instead of double-framing. */
const ShellContext = createContext(false);

export interface AppShellProps {
  children: ReactNode;
  organizationName?: string;
  reportingPeriod?: string;
  openFindings?: number;
  ai?: HeaderAiStatus | null;
}

/**
 * The application frame: fixed sidebar on desktop, a drawer on mobile, sticky
 * header, and the page content in a comfortable reading column.
 *
 * Safe to nest — if a page wraps itself in <AppShell> while the (app) route
 * group layout already provides one, the inner call renders only its children.
 */
export function AppShell({
  children,
  organizationName,
  reportingPeriod,
  openFindings,
  ai,
}: AppShellProps) {
  const insideShell = useContext(ShellContext);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  if (insideShell) return <>{children}</>;

  const sidebar = (
    <Sidebar
      organizationName={organizationName}
      reportingPeriod={reportingPeriod}
      openFindings={openFindings}
    />
  );

  return (
    <ShellContext.Provider value={true}>
      <div className="flex min-h-dvh bg-background">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex">
          {sidebar}
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 h-full w-full bg-overlay"
            />
            <aside
              className={cn(
                "relative flex h-full w-64 animate-slide-in-left flex-col border-r border-sidebar-border bg-sidebar shadow-popover",
              )}
            >
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
                className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
              <Sidebar
                organizationName={organizationName}
                reportingPeriod={reportingPeriod}
                openFindings={openFindings}
                onNavigate={() => setNavOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onOpenNav={() => setNavOpen(true)}
            organizationName={organizationName}
            ai={ai}
          />
          <main className="mx-auto w-full max-w-[100rem] flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
