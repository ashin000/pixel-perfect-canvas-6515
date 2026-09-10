import { createFileRoute } from "@tanstack/react-router";

/**
 * Lightweight probe endpoint used to detect real internet access.
 * Must never be cached (browser or service worker).
 */
export const Route = createFileRoute("/api/public/connectivity-check")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ online: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
            pragma: "no-cache",
            expires: "0",
          },
        }),
    },
  },
});
