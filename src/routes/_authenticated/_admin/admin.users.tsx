import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, type Currency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: accounts } = await supabase.from("accounts").select("*");
      return (profiles ?? []).map((p) => ({ ...p, accounts: (accounts ?? []).filter((a) => a.user_id === p.id) }));
    },
  });
  const filtered = (data ?? []).filter((u) =>
    !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  const [adjust, setAdjust] = useState<{ accountId: string; currency: Currency } | null>(null);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  async function toggleStatus(accountId: string, current: string) {
    const next = current === "active" ? "suspended" : "active";
    const { error } = await supabase.rpc("admin_set_account_status", { _account_id: accountId, _status: next });
    if (error) return toast.error(error.message);
    toast.success(`Account ${next}`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function doAdjust() {
    if (!adjust) return;
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt === 0) return toast.error("Enter a non-zero amount");
    const { error } = await supabase.rpc("admin_adjust_balance", { _account_id: adjust.accountId, _amount: amt, _description: desc || "Admin adjustment" });
    if (error) return toast.error(error.message);
    toast.success("Adjustment applied");
    setAdjust(null); setAmount(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage user accounts and balances.</p>
        </div>
        <Input placeholder="Search by email or name" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        <div className="space-y-3">
          {filtered.map((u) => (
            <Card key={u.id} className="border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <StatusPill status={u.kyc_status} />
              </div>
              <div className="mt-3 space-y-2">
                {u.accounts.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3 text-sm">
                    <div className="flex-1">
                      <div className="font-mono text-xs">{a.account_number}</div>
                      <div className="font-semibold">{formatMoney(a.balance, a.currency as Currency)}</div>
                    </div>
                    <StatusPill status={a.status} />
                    <Button size="sm" variant="outline" onClick={() => setAdjust({ accountId: a.id, currency: a.currency as Currency })}>Adjust</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(a.id, a.status)}>
                      {a.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust balance ({adjust?.currency})</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount (negative to deduct)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={doAdjust}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
