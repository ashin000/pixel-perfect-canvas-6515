import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldCheck, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useConnectivity } from "@/hooks/use-connectivity";
import { getOfflineQuiz, getStudentSession, listAttempts, putAttempt } from "@/lib/db";
import { hasInternetAccess } from "@/services/connectivityService";
import { setActiveAttemptId } from "@/lib/active-attempt";
import { uid } from "@/lib/quiz-utils";
import type { Attempt, OfflineQuiz } from "@/lib/types";

export const Route = createFileRoute("/quiz/offline-check")({
  validateSearch: z.object({ quizId: z.string().optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Ready to start? — AITHERA QUIZ" },
      {
        name: "description",
        content: "Confirm the quiz is stored on your device and the internet is switched off before you start.",
      },
      { property: "og:title", content: "Ready to start? — AITHERA QUIZ" },
      { property: "og:description", content: "The quiz can only begin once this device is fully offline." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfflineCheckPage,
});

function Row({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <span
        className={
          "inline-flex items-center gap-1.5 text-sm font-semibold " +
          (ok === true ? "text-success" : ok === false ? "text-destructive" : "text-muted-foreground")
        }
      >
        {ok === null ? <Loader2 className="size-3.5 animate-spin" /> : ok ? <CheckCircle2 className="size-4" /> : null}
        {value}
      </span>
    </div>
  );
}

function OfflineCheckPage() {
  const { quizId } = Route.useSearch();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<OfflineQuiz | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [session, setSession] = useState<{ studentName: string; roleNumber: string } | null>(null);
  const [resumable, setResumable] = useState<Attempt | null>(null);
  const [starting, setStarting] = useState(false);
  const { state } = useConnectivity({ intervalMs: 2500, offlineConfirmations: 2 });

  useEffect(() => {
    if (!quizId) {
      void navigate({ to: "/" });
      return;
    }
    void (async () => {
      const [q, s, attempts] = await Promise.all([getOfflineQuiz(quizId), getStudentSession(), listAttempts()]);
      setQuiz(q ?? null);
      setSession(s ? { studentName: s.studentName, roleNumber: s.roleNumber ?? s.registerNumber } : null);
      setReady(Boolean(q?.offlineReady && q.questions.length > 0));
      setResumable(
        attempts.find(
          (a) => a.quizId === quizId && a.status === "IN_PROGRESS" && (a.roleNumber ?? a.registerNumber) === (s?.roleNumber ?? s?.registerNumber ?? ""),
        ) ?? null,
      );
    })();
  }, [quizId]);

  const canStart = ready === true && state === "offline";

  async function start() {
    if (!quiz || !session || !canStart) return;
    setStarting(true);
    try {
      // Final check right before starting — closes the race window.
      if (await hasInternetAccess()) {
        toast.error("Internet is still on. Turn it off to start the quiz.");
        return;
      }
      if (resumable) {
        setActiveAttemptId(resumable.attemptId);
        navigate({ to: "/attempt" });
        return;
      }
      const now = new Date();
      const attempt: Attempt = {
        attemptId: uid(),
        quizId: quiz.id,
        quizCode: quiz.code,
        quizTitle: quiz.title,
        studentName: session.studentName,
        roleNumber: session.roleNumber,
        registerNumber: session.roleNumber,
        startTime: now.toISOString(),
        deadline: new Date(now.getTime() + quiz.durationMinutes * 60000).toISOString(),
        status: "IN_PROGRESS",
        syncStatus: "PENDING_SYNC",
        answers: {},
        quizVersion: quiz.version,
        connectionEvents: [],
      };
      await putAttempt(attempt);
      setActiveAttemptId(attempt.attemptId);
      navigate({ to: "/attempt" });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="hero-surface grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="surface-card space-y-5 p-7">
          <div>
            <h1 className="text-2xl font-semibold">Ready to start?</h1>
            <p className="mt-1 text-sm text-muted-foreground">{quiz ? quiz.title : "Loading your quiz…"}</p>
          </div>

          <div>
            <Row label="Participant verified" value={session ? "Yes" : "Missing"} ok={session ? true : false} />
            <Row
              label="Quiz downloaded"
              value={ready === null ? "Checking…" : ready ? "Yes" : "Not ready"}
              ok={ready}
            />
            <Row
              label="Offline storage ready"
              value={ready === null ? "Checking…" : ready ? "Yes" : "Not ready"}
              ok={ready}
            />
            <Row
              label="Internet connection"
              value={state === "checking" ? "Checking…" : state === "online" ? "Detected" : "Off"}
              ok={state === "checking" ? null : state === "offline"}
            />
          </div>

          {state === "online" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold text-destructive">Internet connection detected</p>
              <p className="mt-1 text-muted-foreground">
                To start the symposium quiz, disconnect all internet connections on this device. Turn off Wi‑Fi and
                mobile data. Your quiz is already downloaded and will continue offline.
              </p>
            </div>
          )}

          {state === "offline" && ready && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
              <p className="inline-flex items-center gap-2 font-semibold text-success">
                <WifiOff className="size-4" /> You&apos;re ready
              </p>
              <p className="mt-1 text-muted-foreground">The quiz will now run completely offline.</p>
            </div>
          )}

          {ready === false && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
              We couldn&apos;t prepare the quiz for offline use. Please contact the event coordinator before starting.
            </div>
          )}

          <Button className="w-full" size="lg" disabled={!canStart || starting} onClick={() => void start()}>
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Checking…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" /> {resumable ? "Resume quiz" : "Start quiz"}
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Wrong quiz?{" "}
            <Link to="/" className="text-primary underline-offset-4 hover:underline">
              Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
