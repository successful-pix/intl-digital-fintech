import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownLeft, Download, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/currency";
import { useSession } from "@/lib/use-session";
import { downloadReceipt, printReceipt, type ReceiptData } from "@/lib/pdf-receipt";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({ meta: [{ title: "Deposit History — International Digital" }] }),
  component: Deposits,
});

const PAGE_SIZE = 10;

function Deposits() {
  const { user } = useSession();
  const [filter, setFilter] = useState<"ALL" | Currency>("ALL");
  const [page, setPage] = useState(0);

  const { data: myAccounts } = useQuery({
    queryKey: ["my-accounts", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("currency").eq("user_id", user!.id)).data ?? [],
  });
  const myCurrencies = Array.from(new Set((myAccounts ?? []).map((a) => a.currency as Currency)));

  const { data, isLoading } = useQuery({
    queryKey: ["deposit-history", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*")
      .eq("receiver_user_id", user!.id).eq("tx_type", "deposit")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return filter === "ALL" ? rows : rows.filter((t) => t.currency === filter);
  }, [data, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clamped = Math.min(page, pages - 1);
  const pageRows = filtered.slice(clamped * PAGE_SIZE, clamped * PAGE_SIZE + PAGE_SIZE);

  function receiptFor(t: NonNullable<typeof data>[number]): ReceiptData {
    return {
      reference: t.reference, date: t.created_at, status: t.status, type: t.tx_type,
      amount: Number(t.amount), currency: t.currency as Currency,
      senderName: t.sender_name, senderAccount: null,
      receiverName: t.receiver_name, receiverAccount: null,
      description: t.description,
    };
  }

  const chips: ("ALL" | Currency)[] = ["ALL", ...myCurrencies];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Deposit history</h1>
          <p className="mt-1 text-sm text-muted-foreground">All incoming credits to your account.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} onClick={() => { setFilter(c); setPage(0); }}
              className={cn("rounded-full border px-3 py-1 text-xs transition",
                filter === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {c === "ALL" ? "All currencies" : `${CURRENCIES[c].flag} ${c}`}
            </button>
          ))}
        </div>

        <Card className="border-border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : pageRows.length === 0 ? (
            <div className="p-16 text-center text-sm text-muted-foreground">No deposits {filter !== "ALL" ? `in ${filter}` : "yet"}.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {pageRows.map((t) => (
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
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border/60 p-3 text-xs text-muted-foreground">
              <span>Showing {clamped * PAGE_SIZE + 1}–{Math.min(filtered.length, (clamped + 1) * PAGE_SIZE)} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" disabled={clamped === 0} onClick={() => setPage(clamped - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span>Page {clamped + 1} of {pages}</span>
                <Button size="icon" variant="ghost" disabled={clamped >= pages - 1} onClick={() => setPage(clamped + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
