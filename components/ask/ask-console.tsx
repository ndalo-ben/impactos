"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Badge, Button, Card, InlineAlert, Spinner, Textarea } from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/api/client";

interface Citation {
  id: string;
  label: string;
  kind: "finding" | "document";
}

interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  citations?: Citation[];
  failed?: boolean;
}

const SUGGESTIONS = [
  "Where do our reported numbers disagree?",
  "Summarise the beneficiary position for a donor update.",
  "Which activities have no recorded outcome?",
  "What should we reconcile before the next report?",
];

/** Grounded Q&A over the workspace. The model never answers from outside it. */
export function AskConsole({
  organizationName,
  reportingPeriod,
  ai,
  initialQuestion,
}: {
  organizationName: string;
  reportingPeriod: string;
  ai: { configured: boolean; message: string };
  initialQuestion?: string | null;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setQuestion("");
    const history = turns
      .filter((turn) => !turn.failed)
      .slice(-6)
      .map((turn) => ({ role: turn.role, content: turn.content }));
    const userTurn: Turn = { id: "u" + Date.now(), role: "user", content: trimmed };
    setTurns((current) => [...current, userTurn]);
    setBusy(true);
    try {
      const answer = await apiPost<{ answer: string; model: string; citations: Citation[] }>("/api/ask", {
        question: trimmed,
        history,
      });
      setTurns((current) => [
        ...current,
        {
          id: "a" + Date.now(),
          role: "assistant",
          content: answer.answer,
          model: answer.model,
          citations: answer.citations,
        },
      ]);
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      setTurns((current) => [
        ...current,
        { id: "e" + Date.now(), role: "assistant", content: message, failed: true },
      ]);
    } finally {
      setBusy(false);
      window.setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }

  useEffect(() => {
    if (!initialQuestion || asked.current) return;
    asked.current = true;
    void ask(initialQuestion);
  }, [initialQuestion]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ask ImpactOS"
        title="Ask a question about this workspace"
        description={
          "Answers are grounded in " +
          organizationName +
          "'s own records for " +
          reportingPeriod +
          ", and cite what they used. ImpactOS will not answer from outside your data."
        }
        actions={
          <Badge tone={ai.configured ? "success" : "warning"} size="md" dot title={ai.message}>
            {ai.configured ? "AI connected" : "AI not connected"}
          </Badge>
        }
      />

      {!ai.configured ? (
        <InlineAlert tone="warning" title="Ask needs pre.dev AI">
          {ai.message} Everything else in ImpactOS still works from the rules-based reader.
        </InlineAlert>
      ) : null}

      {turns.length === 0 && ai.configured ? (
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Try asking
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <Button key={suggestion} variant="secondary" size="sm" onClick={() => ask(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {turns.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {turns.map((turn) =>
            turn.role === "user" ? (
              <li key={turn.id} className="flex justify-end">
                <p className="max-w-2xl rounded-lg rounded-br-sm border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm leading-relaxed">
                  {turn.content}
                </p>
              </li>
            ) : (
              <li key={turn.id} className="flex justify-start">
                <Card className="max-w-3xl p-5">
                  <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    ImpactOS
                  </p>
                  <p
                    className={
                      turn.failed
                        ? "mt-2 text-sm leading-relaxed text-danger-text"
                        : "mt-2 text-sm leading-relaxed whitespace-pre-line text-pretty"
                    }
                  >
                    {turn.content}
                  </p>
                  {turn.citations && turn.citations.length > 0 ? (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Sources
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {turn.citations.map((citation) => (
                          <li key={citation.kind + citation.id}>
                            <Link
                              href={
                                citation.kind === "finding"
                                  ? "/insights?finding=" + encodeURIComponent(citation.id)
                                  : "/documents/" + citation.id
                              }
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              {citation.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {turn.model ? (
                    <p className="mt-3 text-xs text-muted-foreground">Answered by {turn.model}</p>
                  ) : null}
                </Card>
              </li>
            ),
          )}
          <li>
            {busy ? <Spinner label="Reading your workspace…" /> : null}
            <div ref={bottom} />
          </li>
        </ul>
      ) : null}

      {error && !ai.configured ? null : error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="ask-question" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Your question
          </label>
          <Textarea
            id="ask-question"
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void ask(question);
              }
            }}
            placeholder="e.g. Which figures should we reconcile before the donor update?"
            disabled={busy || !ai.configured}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">⌘↵ to send · answers cite their sources</p>
            <Button type="submit" loading={busy} disabled={!ai.configured || !question.trim()}>
              <Send aria-hidden="true" />
              Ask
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
