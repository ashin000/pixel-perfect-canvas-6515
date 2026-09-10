import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Trophy } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { listAllCloudAttempts } from "@/lib/cloud";
import { getActiveAttemptId } from "@/lib/active-attempt";
import {
  LEADERBOARD_RULE_TEXT,
  LEADERBOARD_RULE_TEXT_SECONDARY,
  formatQuizTime,
  formatScore,
  rankResults,
} from "@/utils/leaderboard";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — AITHERA QUIZ" },
      { name: "description", content: "Live standings of the AITHERA 2026 symposium quiz challenge." },
      { property: "og:title", content: "Leaderboard — AITHERA QUIZ" },
      { property: "og:description", content: "See the top scorers of the AITHERA 2026 quiz challenge." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: listAllCloudAttempts,
  });
  const [myAttemptId, setMyAttemptId] = useState<string | null>(null);

  useEffect(() => {
    setMyAttemptId(getActiveAttemptId());
  }, []);

  const rows = rankResults(data.filter((a) => a.status === "SUBMITTED"));
  const podium = rows.slice(0, 3);

  return (
    <div className="hero-surface min-h-screen">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          AITHERA QUIZ
        </Link>
        <StatusPill />
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{LEADERBOARD_RULE_TEXT}</p>
        <p className="text-xs text-muted-foreground">{LEADERBOARD_RULE_TEXT_SECONDARY}</p>

        {podium.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {podium.map((a) => (
              <div key={a.attemptId} className="surface-card p-4 text-center">
                <p className="text-xs font-semibold text-primary">Rank {a.rank}</p>
                <p className="mt-1 truncate font-medium">{a.studentName}</p>
                <p className="truncate text-xs text-muted-foreground">{a.roleNumber ?? a.registerNumber}</p>
                <p className="mt-2 text-2xl font-bold">{formatScore(a.score)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatQuizTime(a.timeTaken)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="surface-card mt-6 overflow-x-auto">
          {isLoading && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No results yet.</p>
          )}
          {!isLoading && rows.length > 0 && (
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
                {rows.map((a) => (
                  <tr
                    key={a.attemptId}
                    className={
                      "border-b border-border last:border-0 " +
                      (a.attemptId === myAttemptId ? "bg-primary/10 font-medium" : "")
                    }
                  >
                    <td className="px-4 py-3 font-semibold">{a.rank}</td>
                    <td className="px-4 py-3">{a.roleNumber ?? a.registerNumber}</td>
                    <td className="px-4 py-3">{a.studentName}</td>
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
          )}
        </div>
      </main>
    </div>
  );
}
