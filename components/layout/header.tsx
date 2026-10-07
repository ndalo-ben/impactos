"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, MessageSquare, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";

export interface HeaderAiStatus {
  configured: boolean;
  message: string;
}

export interface HeaderProps {
  onOpenNav?: () => void;
  organizationName?: string;
  ai?: HeaderAiStatus | null;
  className?: string;
}

/**
 * The sticky application bar: mobile nav trigger, a real search field that
 * routes to /ask, the AI readiness pill and the theme switch.
 */
export function Header({ onOpenNav, organizationName, ai, className }: HeaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    router.push("/ask?q=" + encodeURIComponent(trimmed));
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-4",
        className,
      )}
    >
      {onOpenNav ? (
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground lg:hidden"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      <Link href="/" className="text-sm font-semibold tracking-tight lg:hidden">
        ImpactOS
      </Link>

      <form onSubmit={submit} role="search" className="relative ml-auto w-full max-w-md lg:ml-0">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask about your programmes, evidence, numbers…"
          aria-label="Ask ImpactOS"
          className="h-9 w-full rounded-md border border-input bg-card pr-16 pl-9 text-sm shadow-card transition-colors placeholder:text-muted-foreground/75"
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground sm:block">
          ⌘K
        </span>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {ai ? (
          <span
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium md:inline-flex",
              ai.configured
                ? "border-success/30 bg-success/10 text-success-text"
                : "border-border bg-muted text-muted-foreground",
            )}
            title={ai.message}
          >
            {ai.configured ? (
              <Sparkles className="size-3" aria-hidden="true" />
            ) : (
              <MessageSquare className="size-3" aria-hidden="true" />
            )}
            {ai.configured ? "AI connected" : "Rules-based"}
          </span>
        ) : null}
        <ThemeToggle />
        {organizationName ? (
          <span className="hidden text-xs font-medium text-muted-foreground lg:inline">
            {organizationName}
          </span>
        ) : null}
      </div>
    </header>
  );
}
