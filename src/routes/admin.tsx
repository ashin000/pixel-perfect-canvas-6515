import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/status-pill";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Coordinator access — AITHERA QUIZ" },
      { name: "description", content: "Coordinator sign-in for the AITHERA 2026 quiz competition." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/questions", label: "Questions", icon: ListChecks },
  { to: "/admin/create", label: "Create quiz", icon: FilePlus2 },
  { to: "/admin/participants", label: "Participants", icon: Users },
  { to: "/admin/results", label: "Results", icon: BarChart3 },
  { to: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function CoordinatorLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      void navigate({ to: "/admin/dashboard", replace: true });
    } catch {
      setError("Invalid admin credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-surface grid min-h-screen place-items-center px-5 py-12">
      <form onSubmit={(e) => void submit(e)} className="surface-card w-full max-w-sm space-y-4 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">
            <span className="font-serif italic">AITHERA</span> QUIZ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Coordinator Access</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "SIGN IN"}
        </Button>
      </form>
    </div>
  );
}

function AdminLayout() {
  const { user, loading, checking, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !checking && !user) return;
  }, [loading, checking, user]);

  if (loading || checking) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!user) return <CoordinatorLogin />;

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-sidebar-border bg-sidebar md:min-h-screen md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-5 py-4 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="text-sm">AITHERA QUIZ</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-3 md:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => void logout().then(() => navigate({ to: "/admin", replace: true }))}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
          <div className="text-sm">
            <p className="font-semibold">{user.name}</p>
            <p className="text-muted-foreground">{user.email} · Coordinator</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill />
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => void logout().then(() => navigate({ to: "/admin", replace: true }))}
            >
              Sign out
            </Button>
          </div>
        </header>
        <div className="px-5 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
