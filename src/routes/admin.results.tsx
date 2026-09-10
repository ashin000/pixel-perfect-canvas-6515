import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherAttempts, useTeacherQuizzes } from "@/hooks/use-teacher-data";
import { formatQuizTime, formatScore, rankResults } from "@/utils/leaderboard";

export const Route = createFileRoute("/admin/results")({
  head: () => ({
    meta: [
      { title: "Results & leaderboard — AITHERA QUIZ" },
      { name: "description", content: "See who attempted each quiz, their scores, ranking and submission sync state." },
      { property: "og:title", content: "Results — AITHERA QUIZ" },
      { property: "og:description", content: "Scores, ranking and sync status for every submission." },
    ],
  }),
  component: Results,
});

function Results() {
  const { data: quizzes = [] } = useTeacherQuizzes();
  const { data: attempts = [] } = useTeacherAttempts(quizzes.map((q) => q.id));
  const [quizId, setQuizId] = useState<string>("all");

  const rows = useMemo(
    () =>
      rankResults(attempts.filter((a) => a.status === "SUBMITTED" && (quizId === "all" || a.quizId === quizId))),
    [attempts, quizId],
  );

  function exportCsv() {
    const header = [
      "Rank",
      "Student",
      "Role number",
      "Quiz",
      "Score",
      "Total marks",
      "Correct",
      "Wrong",
      "Unanswered",
      "Percentage",
      "Time taken",
      "Submitted at",
    ];
    const lines = rows.map((a) =>
      [
        a.rank,
        a.studentName,
        a.roleNumber ?? a.registerNumber,
        a.quizTitle,
        formatScore(a.score),
        a.totalMarks ?? "",
        a.correct ?? 0,
        a.wrong ?? 0,
        a.unanswered ?? 0,
        `${a.percentage ?? 0}%`,
        formatQuizTime(a.timeTaken),
        a.endTime ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <p className="text-sm text-muted-foreground">
            Ranked by score, then by fastest completion time, then by earliest submission.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          >
            <option value="all">All quizzes</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Role number</th>
              <th className="px-4 py-3 font-medium">Quiz</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Correct</th>
              <th className="px-4 py-3 font-medium">Wrong</th>
              <th className="px-4 py-3 font-medium">Time taken</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Connection events</th>
              <th className="px-4 py-3 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                  No submissions yet.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.attemptId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold">{a.rank}</td>
                <td className="px-4 py-3 font-medium">{a.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.roleNumber ?? a.registerNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.quizTitle}</td>
                <td className="px-4 py-3">
                  {formatScore(a.score)}
                  {a.totalMarks ? <span className="text-muted-foreground"> / {a.totalMarks}</span> : null}{" "}
                  <span className="text-muted-foreground">({a.percentage ?? 0}%)</span>
                </td>
                <td className="px-4 py-3">{a.correct ?? 0}</td>
                <td className="px-4 py-3">{a.wrong ?? 0}</td>
                <td className="px-4 py-3 tabular-nums">{formatQuizTime(a.timeTaken)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      a.passed
                        ? "rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success"
                        : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
                    }
                  >
                    {a.passed ? "Pass" : "Fail"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {(a.connectionEvents?.length ?? 0) === 0 ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    <span
                      className="rounded-full bg-accent/20 px-2 py-0.5 font-semibold text-accent-foreground"
                      title={(a.connectionEvents ?? [])
                        .map(
                          (e) =>
                            `${new Date(e.detectedAt).toLocaleTimeString()} — ${Math.round((e.duration ?? 0) / 1000)}s`,
                        )
                        .join("\n")}
                    >
                      {a.connectionEvents?.length} to review
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">Received</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
