import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, Percent, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherAttempts, useTeacherQuizzes } from "@/hooks/use-teacher-data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — AITHERA QUIZ" },
      { name: "description", content: "Overview of your quizzes, attempts, average scores and recent submissions." },
      { property: "og:title", content: "Admin dashboard — AITHERA QUIZ" },
      { property: "og:description", content: "Track quizzes, attempts and student submissions in one place." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: quizzes = [] } = useTeacherQuizzes();
  const { data: attempts = [] } = useTeacherAttempts(quizzes.map((q) => q.id));

  const submitted = attempts.filter((a) => a.status === "SUBMITTED");
  const avg =
    submitted.length > 0
      ? Math.round((submitted.reduce((s, a) => s + (a.percentage ?? 0), 0) / submitted.length) * 10) / 10
      : 0;

  const stats = [
    { label: "Total quizzes", value: quizzes.length, icon: BookOpen },
    { label: "Published quizzes", value: quizzes.filter((q) => q.published).length, icon: CheckCircle2 },
    { label: "Total attempts", value: submitted.length, icon: Users },
    { label: "Average score", value: `${avg}%`, icon: Percent },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Everything you've published and how students are doing.</p>
        </div>
        <Button asChild>
          <Link to="/admin/create">Create quiz</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent quizzes</h2>
            <Link to="/admin/questions" className="inline-flex items-center gap-1 text-sm text-primary">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {quizzes.length === 0 && <p className="text-sm text-muted-foreground">No quizzes yet.</p>}
            {quizzes.slice(0, 5).map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.questions.length} questions
                  </p>
                </div>
                <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs">{q.published ? q.code : "Draft"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent submissions</h2>
            <Link to="/admin/results" className="inline-flex items-center gap-1 text-sm text-primary">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {submitted.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
            {submitted
              .slice()
              .sort((a, b) => (b.endTime ?? "").localeCompare(a.endTime ?? ""))
              .slice(0, 5)
              .map((a) => (
                <div key={a.attemptId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.studentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.roleNumber ?? a.registerNumber} · {a.quizTitle}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{a.percentage ?? 0}%</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
