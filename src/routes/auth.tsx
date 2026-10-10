import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Auth disabled - SentinelX" },
      {
        name: "description",
        content: "Authentication UI is disabled while the backend test console is being built.",
      },
    ],
  }),
  component: AuthDisabled,
});

function AuthDisabled() {
  return <Navigate to="/dashboard" />;
}
