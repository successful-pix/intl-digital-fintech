import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, ArrowLeftRight, ShieldCheck, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({ meta: [{ title: "Admin — International Digital" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: users }, { count: pending }, { count: kyc }, { count: threads }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "pending"),
        supabase.from("support_messages").select("*", { count: "exact", head: true }).eq("read_by_admin", false).eq("is_admin", false),
      ]);
      return { users: users ?? 0, pending: pending ?? 0, kyc: kyc ?? 0, threads: threads ?? 0 };
    },
  });

  const tiles = [
    { icon: Users, label: "Users", value: stats?.users ?? "—", to: "/admin/users" },
    { icon: ArrowLeftRight, label: "Pending transfers", value: stats?.pending ?? "—", to: "/admin/transactions" },
    { icon: ShieldCheck, label: "KYC to review", value: stats?.kyc ?? "—", to: "/admin/kyc" },
    { icon: MessageSquare, label: "Unread support", value: stats?.threads ?? "—", to: "/admin/support" },
  ] as const;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Admin Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage users, transactions, KYC and support.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to}>
              <Card className="border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-glow">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><t.icon className="h-4 w-4 text-primary" /></div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</div>
                    <div className="font-display text-2xl font-bold">{t.value}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
