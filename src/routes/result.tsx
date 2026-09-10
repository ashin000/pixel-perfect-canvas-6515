import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CloudUpload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { getAttempt, getOfflineQuiz } from "@/lib/db";
import { getActiveAttemptId } from "@/lib/active-attempt";
import { runSync } from "@/lib/sync";
import { calculateTimeTaken, formatQuizTime, formatScore } from "@/utils/leaderboard";
import type { Attempt, OfflineQuiz } from "@/lib/types";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Quiz result — AITHERA QUIZ" },
      { name: "description", content: "Your score, correct and incorrect answers, and the sync status of your submission." },
      { property: "og:title", content: "Quiz result — AITHERA QUIZ" },
      { property: "og:description", content: "Score summary and submission sync status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quiz, setQuiz] = useState<OfflineQuiz | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = async (id = attemptId) => {
    if (!id) return;
    const a = await getAttempt(id);
    setAttempt(a ?? null);
    if (a) setQuiz((await getOfflineQuiz(a.quizId)) ?? null);
  };

  useEffect(() => {
    const id = getActiveAttemptId();
    setAttemptId(id);
    void load(id);
    const t = window.setInterval(() => void load(id), 5000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!attempt) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading result…</div>;
  }

  const showScore = quiz?.settings.showResultImmediately ?? true;
  const timeTakenMs = attempt.timeTaken ?? calculateTimeTaken(attempt.startTime, attempt.endTime);
  const timeTaken = attempt.endTime ? formatQuizTime(timeTakenMs) : "—";

  const stats = [
    { label: "Correct", value: attempt.correct ?? 0 },
    { label: "Incorrect", value: attempt.wrong ?? 0 },
    { label: "Unanswered", value: attempt.unanswered ?? 0 },
    { label: "Time taken", value: timeTaken },
  ];

  return (
    <div className="hero-surface min-h-screen">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="font-semibold">
          AITHERA QUIZ
        </Link>
        <StatusPill />
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="surface-card p-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> Quiz completed
          </span>
          <h1 className="mt-4 text-xl font-semibold">{attempt.quizTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {attempt.studentName} · {attempt.roleNumber ?? attempt.registerNumber}
          </p>

          {showScore ? (
            <>
              <p className="mt-6 text-5xl font-bold">
                {formatScore(attempt.score)}
                {attempt.totalMarks ? (
                  <span className="text-2xl text-muted-foreground"> / {attempt.totalMarks}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{attempt.percentage ?? 0}% score</p>
              <p
                className={
                  "mt-4 inline-block rounded-full px-3 py-1 text-sm font-semibold " +
                  (attempt.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")
                }
              >
                {attempt.passed ? "Passed" : "Not passed"}
              </p>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Your teacher will publish the result. Your answers are saved safely.
            </p>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border px-3 py-3">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="mt-1 text-lg font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 rounded-xl border border-border p-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CloudUpload className="size-4 text-primary" />
                {attempt.syncStatus === "SYNCED"
                  ? "Submission delivered to your teacher"
                  : attempt.syncStatus === "SYNC_FAILED"
                    ? "Upload failed — it will retry automatically"
                    : "Saved on this device, waiting for internet"}
              </div>
              {attempt.syncStatus !== "SYNCED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncing}
                  onClick={async () => {
                    setSyncing(true);
                    await runSync();
                    await load();
                    setSyncing(false);
                  }}
                >
                  <RefreshCw className="size-4" /> Sync now
                </Button>
              )}
            </div>
          </div>

          <Button asChild variant="ghost" className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
