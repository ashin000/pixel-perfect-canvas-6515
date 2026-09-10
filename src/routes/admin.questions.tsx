import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTeacherQuizzes } from "@/hooks/use-teacher-data";
import { deleteQuizFromCloud } from "@/lib/cloud";

export const Route = createFileRoute("/admin/questions")({
  head: () => ({
    meta: [
      { title: "My quizzes — AITHERA QUIZ" },
      { name: "description", content: "All quizzes you created, their quiz codes and publication status." },
      { property: "og:title", content: "My quizzes — AITHERA QUIZ" },
      { property: "og:description", content: "Manage quizzes, copy quiz codes and edit questions." },
    ],
  }),
  component: QuizList,
});

function QuizList() {
  const { data: quizzes = [], refetch, isLoading } = useTeacherQuizzes();

  async function remove(id: string) {
    await deleteQuizFromCloud(id);
    toast.success("Quiz deleted");
    void refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My quizzes</h1>
          <p className="text-sm text-muted-foreground">Share the code with students so they can load the quiz.</p>
        </div>
        <Button asChild>
          <Link to="/admin/create">Create quiz</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && quizzes.length === 0 && (
        <div className="surface-card p-10 text-center">
          <p className="font-medium">No quizzes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first quiz and publish it to get a code.</p>
          <Button asChild className="mt-5">
            <Link to="/admin/create">Create quiz</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {quizzes.map((q) => (
          <div key={q.id} className="surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{q.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {q.questions.length} questions · {q.durationMinutes} min
                </p>
              </div>
              <span
                className={
                  q.published
                    ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
                    : "rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                }
              >
                {q.published ? "Published" : "Draft"}
              </span>
            </div>

            {q.published && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(q.code);
                  toast.success(`Code ${q.code} copied`);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-sm"
              >
                {q.code} <Copy className="size-3.5" />
              </button>
            )}

            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/create" search={{ id: q.id }}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void remove(q.id)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
