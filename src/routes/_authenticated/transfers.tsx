import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, type Currency } from "@/lib/currency";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({ meta: [{ title: "Transfers — International Digital" }] }),
  component: Transfers,
});

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function Transfers() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: account } = useQuery({
    queryKey: ["my-account", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !account || !profile) return;
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount.");
    if (amt > Number(account.balance)) return toast.error("Insufficient balance.");
    if (!profile.transfer_pin_hash) return toast.error("Set your Transfer PIN in Profile first.");
    if (!pin || pin.length < 4) return toast.error("Enter your Transfer PIN.");

    setBusy(true);
    try {
      const pinHash = await sha256Hex(pin);
      if (pinHash !== profile.transfer_pin_hash) throw new Error("Incorrect PIN.");

      // Resolve recipient by account number or email
      const rc = recipient.trim();
      let recvAccount: { id: string; user_id: string; currency: string } | null = null;
      let recvProfile: { id: string; full_name: string | null; email: string } | null = null;

      const byNum = await supabase.from("accounts").select("id,user_id,currency").eq("account_number", rc).maybeSingle();
      if (byNum.data) {
        recvAccount = byNum.data;
      } else {
        const p = await supabase.from("profiles").select("id,full_name,email").eq("email", rc.toLowerCase()).maybeSingle();
        if (p.data) {
          recvProfile = p.data;
          const a = await supabase.from("accounts").select("id,user_id,currency").eq("user_id", p.data.id).maybeSingle();
          recvAccount = a.data;
        }
      }
      if (!recvAccount) throw new Error("Recipient not found.");
      if (recvAccount.user_id === user.id) throw new Error("Cannot transfer to yourself.");
      if (recvAccount.currency !== account.currency) throw new Error("Currency mismatch with recipient account.");

      if (!recvProfile) {
        const p = await supabase.from("profiles").select("id,full_name,email").eq("id", recvAccount.user_id).maybeSingle();
        recvProfile = p.data;
      }

      const { error } = await supabase.from("transactions").insert({
        tx_type: "transfer",
        status: "pending",
        amount: amt,
        currency: account.currency,
        sender_account_id: account.id,
        sender_user_id: user.id,
        sender_name: profile.full_name ?? profile.email,
        receiver_account_id: recvAccount.id,
        receiver_user_id: recvAccount.user_id,
        receiver_name: recvProfile?.full_name ?? recvProfile?.email ?? "Recipient",
        description: description || null,
      });
      if (error) throw error;

      toast.success("Transfer submitted. Awaiting approval.");
      setRecipient(""); setAmount(""); setDescription(""); setPin("");
      qc.invalidateQueries({ queryKey: ["recent-tx"] });
      qc.invalidateQueries({ queryKey: ["all-tx"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Send money</h1>
          <p className="mt-1 text-sm text-muted-foreground">Instant transfers to any International Digital account.</p>
        </div>

        {account && (
          <Card className="border-border bg-card p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Available balance</div>
            <div className="mt-1 font-display text-2xl font-bold">{formatMoney(account.balance, account.currency as Currency)}</div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">{account.account_number}</div>
          </Card>
        )}

        <Card className="border-border bg-card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient</Label>
              <Input id="recipient" placeholder="Account number or email" value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
              <p className="mt-1 text-xs text-muted-foreground">Recipient must hold a {account?.currency ?? ""} account.</p>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pin">Transfer PIN</Label>
              <Input id="pin" type="password" inputMode="numeric" maxLength={6} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit transfer
            </Button>
            <p className="text-center text-xs text-muted-foreground">Transfers are reviewed and approved by our compliance team.</p>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
