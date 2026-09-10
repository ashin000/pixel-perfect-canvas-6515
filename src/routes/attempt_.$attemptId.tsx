import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { setActiveAttemptId } from "@/lib/active-attempt";

export const Route = createFileRoute("/attempt_/$attemptId")({
  head: () => ({
    meta: [
      { title: "Opening quiz — AITHERA QUIZ" },
      { name: "description", content: "Opening the locally saved AITHERA QUIZ attempt." },
      { property: "og:title", content: "Opening quiz — AITHERA QUIZ" },
      { property: "og:description", content: "Opening the locally saved quiz attempt." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LegacyAttemptRedirect,
});

function LegacyAttemptRedirect() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setActiveAttemptId(attemptId);
    void navigate({ to: "/attempt", replace: true });
  }, [attemptId, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Recovering your saved quiz…
    </div>
  );
}