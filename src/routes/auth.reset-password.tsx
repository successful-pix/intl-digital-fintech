// Legacy reset route — now handled inline in /auth/verify. Redirect to the new flow.
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — International Digital" }] }),
  component: () => <Navigate to="/auth" search={{ mode: "forgot" }} />,
});
