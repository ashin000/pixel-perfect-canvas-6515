import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTeacherAttempts, useTeacherQuizzes } from "@/hooks/use-teacher-data";

export const Route = createFileRoute("/admin/participants")({
  head: () => ({
    meta: [
      { title: "Participants — AITHERA QUIZ" },
      { name: "description", content: "Every participant who joined an AITHERA 2026 quiz, with their status and score." },
      { property: "og:title", content: "Participants — AITHERA QUIZ" },
      { property: "og:description", content: "Participant list for the AITHERA 2026 quiz competition." },
    ],
  }),
  component: Participants,
});

function Participants() {
  const { data: quizzes = [] } = useTeacherQuizzes();
  const { data: attempts = [] } = useTeacherAttempts(quizzes.map((q) => q.id));

  const rows = useMemo(
    () => attempts.slice().sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? "")),
    [attempts],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Participants</h1>
        <p className="text-sm text-muted-foreground">Everyone who has joined a quiz on this device network.</p>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Participant</th>
              <th className="px-4 py-3 font-medium">Role number</th>
              <th className="px-4 py-3 font-medium">Quiz</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Connection events</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No participants yet.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.attemptId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{a.studentName}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.roleNumber ?? a.registerNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.quizTitle}</td>
                <td className="px-4 py-3">{a.status === "SUBMITTED" ? "Submitted" : "In progress"}</td>
                <td className="px-4 py-3">{a.status === "SUBMITTED" ? `${a.score ?? 0}` : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.connectionEvents?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
