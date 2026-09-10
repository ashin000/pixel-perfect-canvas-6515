import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useTeacherAttempts, useTeacherQuizzes } from "@/hooks/use-teacher-data";
import {
  LEADERBOARD_RULE_TEXT,
  LEADERBOARD_RULE_TEXT_SECONDARY,
  formatQuizTime,
  formatScore,
  rankResults,
} from "@/utils/leaderboard";

export const Route = createFileRoute("/admin/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — AITHERA QUIZ" },
      { name: "description", content: "Live ranking of the AITHERA 2026 symposium quiz competition." },
      { property: "og:title", content: "Leaderboard — AITHERA QUIZ" },
      { property: "og:description", content: "Top scorers of the AITHERA 2026 quiz challenge." },
    ],
  }),
  component: AdminLeaderboard,
});

function AdminLeaderboard() {
  const { data: quizzes = [] } = useTeacherQuizzes();
  const { data: attempts = [] } = useTeacherAttempts(quizzes.map((q) => q.id));

  const rows = useMemo(() => rankResults(attempts.filter((a) => a.status === "SUBMITTED")), [attempts]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{LEADERBOARD_RULE_TEXT}</p>
        <p className="text-xs text-muted-foreground">{LEADERBOARD_RULE_TEXT_SECONDARY}</p>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Role number</th>
              <th className="px-4 py-3 font-medium">Participant</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Correct</th>
              <th className="px-4 py-3 font-medium">Wrong</th>
              <th className="px-4 py-3 font-medium">Time taken</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No results yet.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.attemptId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold">{a.rank}</td>
                <td className="px-4 py-3">{a.roleNumber ?? a.registerNumber}</td>
                <td className="px-4 py-3 font-medium">{a.studentName}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatScore(a.score)} <span className="text-muted-foreground">/ {a.totalMarks ?? "—"}</span>
                </td>
                <td className="px-4 py-3">{a.correct ?? 0}</td>
                <td className="px-4 py-3">{a.wrong ?? 0}</td>
                <td className="px-4 py-3 tabular-nums">{formatQuizTime(a.timeTaken)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
