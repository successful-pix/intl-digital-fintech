import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({ meta: [{ title: "Transfers — International Digital" }] }),
  component: () => (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Transfers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Send money instantly to any International Digital account.</p>
        <Card className="mt-6 border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Transfers are launching in the next release. Your account is ready to receive funds.</p>
        </Card>
      </div>
    </AppShell>
  ),
});
