import { useEffect, useState } from "react";
import { CloudOff, Cloud, RefreshCw } from "lucide-react";
import { useOnline } from "@/hooks/use-online";
import { onSyncChange, pendingSyncCount, runSync } from "@/lib/sync";
import { cn } from "@/lib/utils";

export function StatusPill({ className }: { className?: string }) {
  const online = useOnline();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () => pendingSyncCount().then((n) => alive && setPending(n));
    refresh();
    const off = onSyncChange(refresh);
    const t = window.setInterval(refresh, 5000);
    return () => {
      alive = false;
      off();
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
          online
            ? "border-success/30 bg-success/10 text-success"
            : "border-warning/40 bg-warning/15 text-warning-foreground",
        )}
      >
        {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
        {online ? "Online" : "Offline"}
      </span>
      {pending > 0 && (
        <button
          type="button"
          onClick={() => void runSync()}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-accent-foreground transition-colors hover:bg-accent/25"
        >
          <RefreshCw className="size-3.5" />
          {pending} to sync
        </button>
      )}
    </div>
  );
}
