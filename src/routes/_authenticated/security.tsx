import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Shield, Key, Smartphone, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security — International Digital" }] }),
  component: () => (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Security</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep your account safe.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Key, title: "Transfer PIN", body: "Required for every outgoing transfer.", href: "/profile" },
            { icon: Shield, title: "Password", body: "Change your account password at any time.", href: "/profile" },
            { icon: Smartphone, title: "Device management", body: "Coming soon: review devices signed into your account." },
            { icon: Clock, title: "Login history", body: "Coming soon: audit your recent sign-ins." },
          ].map((it) => (
            <Card key={it.title} className="border-border bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><it.icon className="h-4 w-4 text-primary" /></div>
              <div className="mt-4 text-sm font-semibold">{it.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{it.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  ),
});
