import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2 } from "lucide-react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, CURRENCIES, type Currency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users" }] }),
  component: AdminUsers,
});

type Account = { id: string; account_number: string; agency_code: string | null; balance: number | string; currency: string; status: string };

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: accounts } = await supabase.from("accounts").select("*");
      return (profiles ?? []).map((p) => ({ ...p, accounts: (accounts ?? []).filter((a) => a.user_id === p.id) as Account[] }));
    },
  });
  const filtered = (data ?? []).filter((u) =>
    !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  const [adjust, setAdjust] = useState<{ accountId: string; currency: Currency } | null>(null);
  const [form, setForm] = useState({ amount: "", desc: "", senderName: "", iban: "", bank: "" });

  async function toggleStatus(accountId: string, current: string) {
    const next = current === "active" ? "suspended" : "active";
    const { error } = await supabase.rpc("admin_set_account_status", { _account_id: accountId, _status: next });
    if (error) return toast.error(error.message);
    toast.success(next === "active" ? "Account unblocked" : "Account blocked");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function doAdjust() {
    if (!adjust) return;
    const amt = parseFloat(form.amount);
    if (!isFinite(amt) || amt === 0) return toast.error("Enter a non-zero amount");
    const description = [form.desc, form.iban ? `IBAN/Account: ${form.iban}` : "", form.bank ? `Bank: ${form.bank}` : ""].filter(Boolean).join(" · ");
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _account_id: adjust.accountId,
      _amount: amt,
      _description: description || "Transfer",
      _sender_name: form.senderName || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Balance updated");
    setAdjust(null); setForm({ amount: "", desc: "", senderName: "", iban: "", bank: "" });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage user accounts, balances and access.</p>
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
                      <div className="text-xs text-muted-foreground">
                        {CURRENCIES[a.currency as Currency]?.flag} {a.currency}
                        {a.agency_code && <span className="ml-2">Agency <span className="font-mono">{a.agency_code}</span></span>}
                      </div>
                      <div className="font-mono text-xs">{a.account_number}</div>
                      <div className="font-semibold">{formatMoney(a.balance, a.currency as Currency)}</div>
                    </div>
                    <StatusPill status={a.status} />
                    <Button size="sm" variant="outline" onClick={() => setAdjust({ accountId: a.id, currency: a.currency as Currency })}>
                      Add / deduct funds
                    </Button>
                    <Button
                      size="sm"
                      variant={a.status === "active" ? "destructive" : "default"}
                      onClick={() => toggleStatus(a.id, a.status)}
                    >
                      {a.status === "active" ? <><Ban className="mr-1 h-3.5 w-3.5" />Block</> : <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Unblock</>}
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
            <div><Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="Use a negative amount to deduct" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Positive = deposit / credit. Negative = withdrawal / debit.</p>
            </div>
            <div><Label>Sender / Recipient name</Label>
              <Input placeholder="e.g. John Smith" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Shown on the user's transaction record.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Recipient IBAN / account</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
              <div><Label>Bank</Label><Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></div>
            </div>
            <div><Label>Reason / description</Label><Textarea rows={2} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={doAdjust}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
