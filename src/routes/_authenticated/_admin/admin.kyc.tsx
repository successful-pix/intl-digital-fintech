import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/admin/kyc")({
  head: () => ({ meta: [{ title: "Admin · KYC" }] }),
  component: AdminKyc,
});

function AdminKyc() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").in("kyc_status", ["pending", "rejected", "approved"]).order("updated_at", { ascending: false });
      const { data: docs } = await supabase.from("kyc_documents").select("*");
      return (profiles ?? []).map((p) => ({ ...p, docs: (docs ?? []).filter((d) => d.user_id === p.id) }));
    },
  });

  async function view(path: string) {
    const { data } = await supabase.storage.from("kyc").createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, "_blank");
  }

  async function decide(userId: string, approve: boolean, reason: string) {
    const { error } = await supabase.rpc("admin_set_kyc", {
      _user_id: userId, _status: approve ? "approved" : "rejected", _reason: approve ? "" : (reason || "Rejected"),
    });
    if (error) return toast.error(error.message);
    toast.success("KYC updated");
    qc.invalidateQueries({ queryKey: ["admin-kyc"] });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold sm:text-3xl">KYC Review</h1>
        <div className="space-y-4">
          {(data ?? []).map((u) => <KycRow key={u.id} user={u} onView={view} onDecide={decide} />)}
          {data?.length === 0 && <div className="text-sm text-muted-foreground">No submissions.</div>}
        </div>
      </div>
    </AppShell>
  );
}

function KycRow({ user, onView, onDecide }: {
  user: { id: string; email: string; full_name: string | null; kyc_status: string; docs: { id: string; doc_type: string; storage_path: string }[] };
  onView: (path: string) => void;
  onDecide: (userId: string, approve: boolean, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Card className="border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <div className="font-medium">{user.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
        <StatusPill status={user.kyc_status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {user.docs.map((d) => (
          <Button key={d.id} size="sm" variant="outline" onClick={() => onView(d.storage_path)}>{d.doc_type}</Button>
        ))}
        {user.docs.length === 0 && <span className="text-xs text-muted-foreground">No documents.</span>}
      </div>
      {user.kyc_status === "pending" && (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} placeholder="Reason (only if rejecting)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => onDecide(user.id, true, "")}>Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => onDecide(user.id, false, reason)}>Reject</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
