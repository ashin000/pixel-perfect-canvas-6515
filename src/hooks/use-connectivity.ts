import { useCallback, useEffect, useRef, useState } from "react";
import { hasInternetAccess } from "@/services/connectivityService";

export type ConnectivityState = "checking" | "online" | "offline";

interface Options {
  /** polling interval in ms */
  intervalMs?: number;
  /** consecutive failed probes required before reporting offline */
  offlineConfirmations?: number;
  enabled?: boolean;
}

/**
 * Continuously determines whether this device really has internet access.
 * Starts in "checking" so nothing is unlocked on an unknown state.
 */
export function useConnectivity({ intervalMs = 2500, offlineConfirmations = 2, enabled = true }: Options = {}) {
  const [state, setState] = useState<ConnectivityState>("checking");
  const offlineStreak = useRef(0);
  const busy = useRef(false);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const online = await hasInternetAccess();
      if (!mounted.current) return;
      if (online) {
        offlineStreak.current = 0;
        setState("online");
      } else {
        offlineStreak.current += 1;
        setState((prev) =>
          offlineStreak.current >= offlineConfirmations ? "offline" : prev === "online" ? "checking" : prev,
        );
      }
    } finally {
      busy.current = false;
    }
  }, [offlineConfirmations]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;
    void check();
    const id = window.setInterval(() => void check(), intervalMs);
    const immediate = () => void check();
    window.addEventListener("online", immediate);
    window.addEventListener("offline", immediate);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
      window.removeEventListener("online", immediate);
      window.removeEventListener("offline", immediate);
    };
  }, [check, enabled, intervalMs]);

  return { state, isOffline: state === "offline", isOnline: state === "online", recheck: check };
}
