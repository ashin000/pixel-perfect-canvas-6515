import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { findQuizByCode, listCloudAttempts } from "@/lib/cloud";
import { getStudentSession, listAttempts, saveOfflineQuiz } from "@/lib/db";
import type { Attempt } from "@/lib/types";

export const Route = createFileRoute("/quiz/prepare")({
  validateSearch: z.object({ code: z.string() }),
  head: () => ({
    meta: [
      { title: "Preparing your quiz — AITHERA QUIZ" },
      { name: "description", content: "Your AITHERA 2026 quiz is being saved to this device for offline use." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreparePage,
});

const STEPS = ["Participant verified", "Quiz found", "Questions prepared", "Offline storage ready"] as const;

function PreparePage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<Attempt | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getStudentSession();
      if (!session?.studentName || !(session.roleNumber ?? session.registerNumber)) {
        void navigate({ to: "/", replace: true });
        return;
      }
      const roleNumber = session.roleNumber ?? session.registerNumber;
      if (cancelled) return;
      setDone(1);

      let quiz;
      try {
        quiz = await findQuizByCode(code);
      } catch {
        setError("We couldn't reach the quiz. Check your internet connection and try again.");
        return;
      }
      if (!quiz) {
        setError("That quiz code isn't active. Please check the code given by the coordinator.");
        return;
      }
      if (cancelled) return;
      setDone(2);

      // One attempt per role number per quiz.
      const local = await listAttempts();
      let existing =
        local.find((a) => a.quizId === quiz.id && (a.roleNumber ?? a.registerNumber) === roleNumber) ?? null;
      if (!existing && navigator.onLine) {
        try {
          const cloud = await listCloudAttempts([quiz.id]);
          existing = cloud.find((a) => (a.roleNumber ?? a.registerNumber) === roleNumber) ?? null;
        } catch {
          // offline or unavailable — the local check is enough
        }
      }
      if (existing?.status === "SUBMITTED" && !quiz.settings.allowMultipleAttempts) {
        setError("This participant has already completed this quiz.");
        return;
      }
      if (existing?.status === "IN_PROGRESS") setResume(existing);

      try {
        await saveOfflineQuiz(quiz);
      } catch {
        setError("We couldn't save the quiz on this device. Please contact the event coordinator.");
        return;
      }
      if (cancelled) return;
      // Warm the offline cache so the quiz pages open with no internet at all.
      await Promise.all(
        ["/attempt", "/result", "/quiz/offline-check"].map((path) =>
          fetch(path, { cache: "reload" }).catch(() => undefined),
        ),
      );
      await Promise.all([
        router.preloadRoute({ to: "/attempt" }).catch(() => undefined),
        router.preloadRoute({ to: "/attempt/$attemptId", params: { attemptId: "offline-ready" } }).catch(() => undefined),
        router.preloadRoute({ to: "/result" }).catch(() => undefined),
      ]);
      if (cancelled) return;
      setDone(4);
      window.setTimeout(() => {
        if (!cancelled) void navigate({ to: "/quiz/offline-check", search: { quizId: quiz.id }, replace: true });
      }, 800);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate, router]);

  return (
    <div className="hero-surface grid min-h-screen place-items-center px-5 py-12">
      <div className="surface-card w-full max-w-md space-y-5 p-7">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Preparing your quiz…</h1>
          <StatusPill />
        </div>

        <ul className="space-y-2">
          {STEPS.map((step, i) => {
            const complete = done > i;
            return (
              <li key={step} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                <span className="text-sm">{step}</span>
                {complete ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : error ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ul>

        {resume && !error && (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            You already started this quiz — you'll be able to resume it.
          </p>
        )}

        {error ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Go back</Link>
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Keep the internet on until this finishes. You'll be asked to turn it off on the next screen.
          </p>
        )}
      </div>
    </div>
  );
}
