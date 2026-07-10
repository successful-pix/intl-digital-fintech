import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, type Currency } from "@/lib/currency";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Transactions — International Digital" }] }),
  component: Txns,
});

function Txns() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["all-tx", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*")
      .or(`sender_user_id.eq.${user!.id},receiver_user_id.eq.${user!.id}`)
      .order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">All deposits, transfers and withdrawals.</p>
        </div>
        <Card className="border-border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="p-16 text-center text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {data!.map((t) => {
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
