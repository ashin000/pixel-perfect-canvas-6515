import { Loader2, WifiOff } from "lucide-react";

export function InternetDetectedOverlay({
  studentName,
  clock,
  verifying,
}: {
  studentName: string;
  clock: string;
  verifying: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background px-5">
      <div className="surface-card w-full max-w-lg space-y-4 p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <WifiOff className="size-7" />
        </span>
        <h2 className="text-xl font-semibold">Internet connection detected</h2>
        <p className="text-sm text-muted-foreground">
          The quiz has been temporarily locked. Please turn off Wi‑Fi, mobile data or any other internet connection to
          continue.
        </p>
        <p className="text-sm text-muted-foreground">Your answers are safe. The quiz timer is still running.</p>

        <div className="flex items-center justify-center gap-4 rounded-xl bg-secondary px-4 py-3 text-sm">
          <span className="font-medium">{studentName}</span>
          <span className="font-mono font-semibold text-primary">{clock}</span>
        </div>

        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> {verifying ? "Checking connection…" : "Checking connection…"}
        </p>
      </div>
    </div>
  );
}
