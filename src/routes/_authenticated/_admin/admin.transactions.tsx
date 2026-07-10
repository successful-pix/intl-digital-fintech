import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, type Currency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_admin/admin/transactions")({
  head: () => ({ meta: [{ title: "Admin · Transactions" }] }),
  component: AdminTx,
});

function AdminTx() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-tx"],
    queryFn: async () => (await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  async function decide(id: string, approve: boolean) {
    const { error } = await supabase.rpc("process_transfer", { _tx_id: id, _approve: approve });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-tx"] });
  }

  const pending = (data ?? []).filter((t) => t.status === "pending");
  const rest = (data ?? []).filter((t) => t.status !== "pending");

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve pending transfers and review activity.</p>
        </div>

        <Section title={`Pending (${pending.length})`} items={pending} action={decide} />
        <Section title="Recent activity" items={rest} />
      </div>
    </AppShell>
  );
}

type Tx = {
  id: string; reference: string; amount: number | string; currency: string; status: string;
  tx_type: string; sender_name: string | null; receiver_name: string | null; created_at: string; description: string | null;
};

function Section({ title, items, action }: { title: string; items: Tx[]; action?: (id: string, approve: boolean) => void }) {
  return (
    <Card className="border-border bg-card">
      <div className="border-b border-border/60 p-4 text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.sender_name ?? "System"} → {t.receiver_name ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{t.reference} · {new Date(t.created_at).toLocaleString()}{t.description ? ` · ${t.description}` : ""}</div>
              </div>
              <div className="font-semibold">{formatMoney(Number(t.amount), t.currency as Currency)}</div>
              <StatusPill status={t.status} />
              {action && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => action(t.id, true)} className="bg-success text-white hover:bg-success/90"><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => action(t.id, false)}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
