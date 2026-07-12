import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, Download, Printer } from "lucide-react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, type Currency } from "@/lib/currency";
import { useSession } from "@/lib/use-session";
import { downloadReceipt, printReceipt, type ReceiptData } from "@/lib/pdf-receipt";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({ meta: [{ title: "Deposit History — International Digital" }] }),
  component: Deposits,
});

function Deposits() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["deposit-history", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*")
      .eq("receiver_user_id", user!.id).eq("tx_type", "deposit")
      .order("created_at", { ascending: false })).data ?? [],
  });

  function receiptFor(t: NonNullable<typeof data>[number]): ReceiptData {
    return {
      reference: t.reference, date: t.created_at, status: t.status, type: t.tx_type,
      amount: Number(t.amount), currency: t.currency as Currency,
      senderName: t.sender_name, senderAccount: null,
      receiverName: t.receiver_name, receiverAccount: null,
      description: t.description,
    };
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Deposit history</h1>
          <p className="mt-1 text-sm text-muted-foreground">All incoming credits to your account.</p>
        </div>
        <Card className="border-border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="p-16 text-center text-sm text-muted-foreground">No deposits yet.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {data!.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/15 text-success">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">From {t.sender_name ?? "International Digital"}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.description ?? t.reference}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-success">+{formatMoney(Number(t.amount), t.currency as Currency)}</div>
                    <StatusPill status={t.status} />
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => downloadReceipt(receiptFor(t))} title="Download receipt"><Download className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => printReceipt(receiptFor(t))} title="Print receipt"><Printer className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
