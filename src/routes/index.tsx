import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock3, ListChecks, Sparkles, Trophy, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/status-pill";
import { saveStudentSession } from "@/lib/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AITHERA QUIZ — AITHERA 2026 Symposium Quiz Competition" },
      {
        name: "description",
        content:
          "The official AITHERA 2026 quiz competition by the Department of Artificial Intelligence and Data Science, St. Xavier's Catholic College of Engineering (Autonomous). Enter your name, role number and quiz code, then compete offline.",
      },
      { property: "og:title", content: "AITHERA QUIZ — AITHERA 2026" },
      {
        property: "og:description",
        content:
          "Intelligence beyond imagination. Compete in the AITHERA 2026 symposium quiz — enter your details, prepare offline, and aim for the top of the leaderboard.",
      },
    ],
  }),
  component: Landing,
});

const infoPills = [
  { icon: ListChecks, label: "30 Questions" },
  { icon: Clock3, label: "20 Minutes" },
  { icon: Sparkles, label: "MCQ" },
  { icon: Trophy, label: "Live Leaderboard" },
];


const steps = [
  {
    title: "Enter Details",
    text: "Add your name, role number and quiz code.",
  },
  {
    title: "Prepare Offline",
    text: "Quiz questions are securely prepared on your device.",
  },
  {
    title: "Compete",
    text: "Turn off internet access, start the quiz and aim for the top.",
  },
];

function EntryForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [roleNumber, setRoleNumber] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanRole = roleNumber.trim().toUpperCase();
    const cleanCode = code.trim().toUpperCase();
    if (cleanName.length < 3) {
      toast.error("Enter your full name");
      return;
    }
    if (cleanRole.length < 3 || cleanRole.length > 20) {
      toast.error("Enter the role number given to you");
      return;
    }
    if (cleanCode.length < 3) {
      toast.error("Enter the quiz code given to you");
      return;
    }
    setBusy(true);
    try {
      await saveStudentSession({ studentName: cleanName, roleNumber: cleanRole, registerNumber: cleanRole });
      void navigate({ to: "/quiz/prepare", search: { code: cleanCode } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-8 w-full max-w-md space-y-3 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="pname">Participant Name</Label>
        <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul S" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="prole">Role Number / Participant ID</Label>
        <Input
          id="prole"
          value={roleNumber}
          onChange={(e) => setRoleNumber(e.target.value.toUpperCase())}
          placeholder="AIT024"
          className="font-mono tracking-widest"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pcode">Quiz Code</Label>
        <Input
          id="pcode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="AITHERA26"
          className="font-mono tracking-widest"
          required
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="mt-2 w-full rounded-2xl bg-brand-teal font-display text-sm font-bold tracking-[0.14em] text-white uppercase hover:brightness-110"
      >
        {busy ? "Please wait…" : "Enter Quiz"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Enter the details provided by the event coordinator.
      </p>
    </form>
  );
}

function NetworkLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 160" fill="none" aria-hidden="true" className={className}>
      <path d="M0 140 L70 90 L140 120 L210 50 L280 100 L350 40 L400 70" stroke="var(--brand-cyan)" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M0 100 L90 60 L170 90 L260 30 L340 80 L400 40" stroke="var(--brand-teal)" strokeOpacity="0.2" strokeWidth="1" />
      {[
        [70, 90], [140, 120], [210, 50], [280, 100], [90, 60], [260, 30], [350, 40],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill={i % 2 ? "var(--brand-gold)" : "var(--brand-cyan)"} fillOpacity="0.5" />
      ))}
    </svg>
  );
}

function Skyline() {
  return (
    <svg viewBox="0 0 1200 80" fill="none" aria-hidden="true" preserveAspectRatio="none" className="h-16 w-full">
      <path
        d="M0 80 V60 H60 V44 H110 V60 H170 V36 H205 V58 H280 V48 H330 V64 H420 V40 H455 V60 H540 V50 H600 V66 H680 V42 H720 V58 H800 V46 H860 V62 H940 V38 H980 V56 H1060 V48 H1120 V64 H1200 V80"
        stroke="var(--brand-teal)"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      {[60, 205, 330, 455, 600, 720, 860, 980, 1120].map((cx, i) => (
        <circle key={cx} cx={cx} cy={i % 2 ? 36 : 44} r="2.5" fill="var(--brand-gold)" fillOpacity="0.55" />
      ))}
    </svg>
  );
}

function Landing() {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden text-foreground"
      style={{
        backgroundColor: "oklch(0.985 0.005 190)",
        backgroundImage:
          "linear-gradient(var(--brand-soft) 1px, transparent 1px), linear-gradient(90deg, var(--brand-soft) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      {/* Decorative network lines */}
      <NetworkLines className="pointer-events-none absolute top-0 left-0 h-40 w-full opacity-70" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-teal text-white">
              <Sparkles className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-wide text-brand-teal">AITHERA QUIZ</p>
              <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">AITHERA 2026</p>
            </div>
          </div>
          <StatusPill className="hidden sm:flex" />
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground sm:hidden">
            <Wifi className="size-3.5 text-success" /> Online
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-5 pt-10 pb-8 text-center sm:pt-14">
        {/* Crown / star mark */}
        <svg viewBox="0 0 64 40" className="h-9 w-14 text-brand-gold" fill="none" aria-hidden="true">
          <path d="M6 32 L10 14 L20 26 L32 8 L44 26 L54 14 L58 32 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="8" r="2.5" fill="currentColor" />
          <circle cx="10" cy="14" r="2" fill="currentColor" />
          <circle cx="54" cy="14" r="2" fill="currentColor" />
        </svg>

        <p className="mt-4 text-[11px] font-semibold tracking-[0.28em] text-brand-teal uppercase sm:text-xs">
          Department of Artificial Intelligence and Data Science
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
          St. Xavier's Catholic College of Engineering (Autonomous)
        </p>

        <h1 className="mt-6 font-serif text-5xl font-semibold tracking-tight text-brand-teal sm:text-7xl">
          AITHERA{" "}
          <span className="font-display font-bold tracking-tight text-foreground">QUIZ</span>
        </h1>
        <p className="mt-3 font-display text-xs font-semibold tracking-[0.3em] text-brand-cyan uppercase sm:text-sm">
          Intelligence Beyond Imagination
        </p>
        <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
          Put your knowledge to the test and compete for the top spot in the AITHERA 2026 Quiz Challenge.
        </p>

        {/* Info pills */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {infoPills.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-teal shadow-sm"
            >
              <pill.icon className="size-3.5 text-brand-gold" />
              {pill.label}
            </span>
          ))}
        </div>


        {/* Participant entry */}
        <EntryForm />

        {/* How it works */}
        <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-border bg-white p-4 text-center shadow-sm">
              <span className="mx-auto grid size-8 place-items-center rounded-full bg-brand-soft font-display text-xs font-bold text-brand-teal">
                {i + 1}
              </span>
              <h3 className="mt-2.5 font-display text-sm font-semibold text-brand-teal">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              {i < 2 && (
                <span className="absolute top-1/2 -right-3 hidden size-1.5 -translate-y-1/2 rounded-full bg-brand-gold sm:block" />
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Skyline + footer */}
      <div className="relative z-0 mt-auto">
        <Skyline />
        <footer className="border-t border-border/60 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-5 py-4 text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-brand-teal">AITHERA 2026</p>
            <p className="text-[11px] text-muted-foreground">
              Department of Artificial Intelligence and Data Science · St. Xavier's Catholic College of Engineering (Autonomous)
            </p>
            <p className="text-[11px] font-medium text-brand-gold">Quiz Competition</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
