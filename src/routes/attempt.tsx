import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Flag, Save, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InternetDetectedOverlay } from "@/components/internet-detected-overlay";
import { useConnectivity } from "@/hooks/use-connectivity";
import { enqueueSync, getAttempt, getOfflineQuiz, putAttempt } from "@/lib/db";
import { getActiveAttemptId } from "@/lib/active-attempt";
import { evaluate, formatClock } from "@/lib/quiz-utils";
import { calculateTimeTaken } from "@/utils/leaderboard";
import { runSync } from "@/lib/sync";
import type { Attempt, OfflineQuiz } from "@/lib/types";

export const Route = createFileRoute("/attempt")({
  head: () => ({
    meta: [
      { title: "Quiz in progress — AITHERA QUIZ" },
      { name: "description", content: "Answer questions with automatic local saving, a protected timer and full offline support." },
      { property: "og:title", content: "Quiz in progress — AITHERA QUIZ" },
      { property: "og:description", content: "Your answers are saved on this device after every tap." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttemptPage,
});

function AttemptPage() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quiz, setQuiz] = useState<OfflineQuiz | null>(null);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [remaining, setRemaining] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitting = useRef(false);
  const attemptRef = useRef<Attempt | null>(null);
  attemptRef.current = attempt;

  const active = attempt?.status === "IN_PROGRESS";
  const { state: connectivity } = useConnectivity({
    intervalMs: 2500,
    offlineConfirmations: 2,
    enabled: Boolean(active),
  });
  const locked = active === true && connectivity === "online";

  // Log every internet detection during the quiz; the timer keeps running.
  useEffect(() => {
    const a = attemptRef.current;
    if (!a || a.status !== "IN_PROGRESS") return;
    const events = [...(a.connectionEvents ?? [])];
    const open = events.length > 0 ? events[events.length - 1] : undefined;
    let next: Attempt | null = null;
    if (connectivity === "online" && (!open || open.resolvedAt !== undefined)) {
      events.push({ type: "INTERNET_DETECTED", detectedAt: Date.now() });
      next = { ...a, connectionEvents: events };
    } else if (connectivity === "offline" && open && open.resolvedAt === undefined) {
      const resolvedAt = Date.now();
      events[events.length - 1] = { ...open, resolvedAt, duration: resolvedAt - open.detectedAt };
      next = { ...a, connectionEvents: events };
    }
    if (next) {
      setAttempt(next);
      void putAttempt(next);
    }
  }, [connectivity]);


  useEffect(() => {
    const id = getActiveAttemptId();
    if (!id) {
      navigate({ to: "/", replace: true });
      return;
    }
    setAttemptId(id);
  }, [navigate]);

  useEffect(() => {
    if (!attemptId) return;
    void (async () => {
      const a = await getAttempt(attemptId);
      if (!a) {
        toast.error("This attempt is not on this device");
        navigate({ to: "/" });
        return;
      }
      if (a.status === "SUBMITTED") {
        navigate({ to: "/result" });
        return;
      }
      const q = await getOfflineQuiz(a.quizId);
      setAttempt(a);
      setQuiz(q ?? null);
    })();
  }, [attemptId, navigate]);

  const submit = useCallback(
    async (auto = false) => {
      if (!attempt || !quiz || submitting.current) return;
      if (!auto && locked) return;
      submitting.current = true;
      const result = evaluate(quiz, attempt);
      // startTime is never touched here: it was set once when the participant pressed START QUIZ.
      const endTime = new Date().toISOString();
      const submitted: Attempt = {
        ...attempt,
        ...result,
        status: "SUBMITTED",
        endTime,
        timeTaken: calculateTimeTaken(attempt.startTime, endTime),
        syncStatus: "PENDING_SYNC",
      };
      await putAttempt(submitted);
      await enqueueSync(submitted.attemptId);
      void runSync();
      toast.success(auto ? "Time is up — quiz submitted" : "Quiz submitted and saved on this device");
      navigate({ to: "/result" });
    },
    [attempt, quiz, navigate, locked],
  );

  // Timer anchored to the stored deadline, so reloads cannot extend it.
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const left = new Date(attempt.deadline).getTime() - Date.now();
      setRemaining(left);
      if (left <= 0) void submit(true);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [attempt, submit]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (attempt && attempt.status === "IN_PROGRESS") e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attempt]);

  const questions = quiz?.questions ?? [];
  const current = questions[index];

  const answeredCount = useMemo(
    () => Object.values(attempt?.answers ?? {}).filter((a) => a.selectedIndex !== null).length,
    [attempt],
  );

  async function update(patch: Partial<{ selectedIndex: number | null; markedForReview: boolean }>) {
    if (!attempt || !current || locked) return;
    setSaveState("saving");
    const prev = attempt.answers[current.id];
    const next: Attempt = {
      ...attempt,
      answers: {
        ...attempt.answers,
        [current.id]: {
          questionId: current.id,
          selectedIndex: patch.selectedIndex !== undefined ? patch.selectedIndex : (prev?.selectedIndex ?? null),
          markedForReview: patch.markedForReview ?? prev?.markedForReview ?? false,
          updatedAt: new Date().toISOString(),
        },
      },
    };
    setAttempt(next);
    await putAttempt(next);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1200);
  }

  if (!attempt || !quiz || !current) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading quiz…</div>;
  }

  const low = remaining < 60000;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{quiz.title}</p>
            <p className="text-xs text-muted-foreground">
              {attempt.studentName} · {attempt.roleNumber ?? attempt.registerNumber}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {saveState === "saving" ? (
                "Saving…"
              ) : saveState === "saved" ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Save className="size-3.5" /> Saved locally
                </span>
              ) : (
                `${answeredCount}/${questions.length} answered`
              )}
            </span>
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " +
                (connectivity === "offline"
                  ? "bg-success/15 text-success"
                  : connectivity === "online"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-secondary text-muted-foreground")
              }
            >
              {connectivity === "offline"
                ? "Offline ✓"
                : connectivity === "online"
                  ? "Internet detected"
                  : "Checking connection…"}
            </span>
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold " +
                (low ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")
              }
            >
              <Timer className="size-4" /> {formatClock(remaining)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_260px]">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Question {index + 1} of {questions.length} · {current.marks} mark{current.marks === 1 ? "" : "s"}
          </p>
          <h1 className="mt-3 text-lg font-semibold">{current.text}</h1>

          <div className="mt-6 space-y-3">
            {current.options.map((opt, oi) => {
              const selected = attempt.answers[current.id]?.selectedIndex === oi;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={locked}
                  onClick={() => void update({ selectedIndex: oi })}
                  className={
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors " +
                    (selected ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-secondary")
                  }
                >
                  <span
                    className={
                      "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold " +
                      (selected ? "border-primary bg-primary text-primary-foreground" : "border-border")
                    }
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={locked || index === 0} onClick={() => setIndex((i) => i - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={locked || index === questions.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Next
            </Button>
            <Button variant="ghost" size="sm" disabled={locked} onClick={() => void update({ selectedIndex: null })}>
              Clear answer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={locked}
              onClick={() => void update({ markedForReview: !attempt.answers[current.id]?.markedForReview })}
            >
              <Flag className="size-4" /> Mark for review
            </Button>
          </div>
        </div>

        <aside className="surface-card h-fit p-5">
          <h2 className="text-sm font-semibold">Question palette</h2>
          <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-5">
            {questions.map((q, i) => {
              const a = attempt.answers[q.id];
              const state =
                i === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : a?.markedForReview
                    ? "border-accent bg-accent/20 text-accent-foreground"
                    : a && a.selectedIndex !== null
                      ? "border-success bg-success/15 text-success"
                      : "border-border text-muted-foreground";
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setIndex(i)}
                  className={`grid size-9 place-items-center rounded-lg border text-sm font-medium ${state}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <dl className="mt-5 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded border border-success bg-success/15" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded border border-accent bg-accent/20" /> Marked for review
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded border border-border" /> Not answered
            </div>
          </dl>

          <Button className="mt-5 w-full" disabled={locked} onClick={() => setConfirmOpen(true)}>
            <Check className="size-4" /> Submit quiz
          </Button>
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions. {questions.length - answeredCount}{" "}
              unanswered. You cannot change answers after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep writing</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit(false)}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {locked && (
        <InternetDetectedOverlay studentName={attempt.studentName} clock={formatClock(remaining)} verifying />
      )}
    </div>
  );
}
