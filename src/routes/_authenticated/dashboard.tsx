import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Plus, Send, ArrowLeftRight, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell, StatusPill } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, CURRENCIES, type Currency } from "@/lib/currency";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — International Digital" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("*").eq("user_id", user!.id).order("created_at")).data ?? [],
  });

  const { data: transactions } = useQuery({
    queryKey: ["recent-tx", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*")
      .or(`sender_user_id.eq.${user!.id},receiver_user_id.eq.${user!.id}`)
      .order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  const first = accounts?.[0];
  const currency = (first?.currency ?? "USD") as Currency;
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Hi, {firstName} 👋</h1>
        </div>

        {/* Balance card */}
        <Card className="relative overflow-hidden border-border bg-card p-6 sm:p-8">
          <div className="absolute inset-0 bg-radial-glow opacity-40" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Available balance</div>
              <div className="mt-3 flex items-baseline gap-3">
                {isLoading ? <Skeleton className="h-12 w-64" /> : (
                  <span className="font-display text-4xl font-bold sm:text-5xl">
                    {formatMoney(first?.balance ?? 0, currency)}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{CURRENCIES[currency].flag} {currency}</span>
              </div>
              {first && (
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{first.account_number}</span>
                  <StatusPill status={first.status} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gradient-primary text-primary-foreground"><Link to="/transfers"><Send className="mr-2 h-4 w-4" />Send</Link></Button>
              <Button asChild variant="outline"><Link to="/transactions"><Receipt className="mr-2 h-4 w-4" />History</Link></Button>
            </div>
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Send, label: "Send money", to: "/transfers" },
            { icon: ArrowLeftRight, label: "Deposits", to: "/transactions" },
            { icon: Receipt, label: "Receipts", to: "/transactions" },
            { icon: Plus, label: "Complete KYC", to: "/profile" },
          ].map((a) => (
            <Link key={a.label} to={a.to}>
              <Card className="flex items-center gap-3 border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-glow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><a.icon className="h-4 w-4 text-primary" /></div>
                <span className="text-sm font-medium">{a.label}</span>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <Card className="border-border bg-card">
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <h2 className="text-base font-semibold">Recent transactions</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/transactions">View all</Link></Button>
          </div>
          {transactions === undefined ? (
            <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No transactions yet. Your activity will appear here.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {transactions.map((t) => {
                const isIncoming = t.receiver_user_id === user?.id;
                const label = t.is_admin_adjustment ? (isIncoming ? "Deposit" : "Withdrawal")
                  : t.tx_type === "transfer" ? (isIncoming ? `From ${t.sender_name ?? "Sender"}` : `To ${t.receiver_name ?? "Recipient"}`)
                  : t.tx_type === "deposit" ? "Deposit" : "Withdrawal";
                return (
                  <li key={t.id} className="flex items-center gap-4 p-4 sm:p-5">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isIncoming ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}>
                      {isIncoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{label}</div>
                      <div className="truncate text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${isIncoming ? "text-success" : ""}`}>
                        {isIncoming ? "+" : "−"}{formatMoney(t.amount, t.currency as Currency)}
                      </div>
                      <StatusPill status={t.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
