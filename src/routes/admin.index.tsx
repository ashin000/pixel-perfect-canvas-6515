import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

/** Reached only once the coordinator is signed in (the layout shows the login form otherwise). */
function AdminIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) void navigate({ to: "/admin/dashboard", replace: true });
  }, [user, navigate]);
  return null;
}
