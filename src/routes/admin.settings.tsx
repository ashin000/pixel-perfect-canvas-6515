import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AITHERA QUIZ" },
      { name: "description", content: "Coordinator access settings for the AITHERA 2026 quiz competition." },
      { property: "og:title", content: "Settings — AITHERA QUIZ" },
      { property: "og:description", content: "Coordinator account details for AITHERA QUIZ." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Coordinator account and access.</p>
      </div>

      <div className="surface-card space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Signed in as
        </div>
        <div className="rounded-lg border border-border px-3 py-2 text-sm">
          <p className="font-medium">{user?.name}</p>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Coordinator accounts are created manually by the event organiser. There is no public sign-up, and
          participants never sign in — they enter a name, role number and quiz code.
        </p>
      </div>
    </div>
  );
}
