import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({ meta: [{ title: "KYC — International Digital" }] }),
  component: KycPage,
});

const DOC_TYPES = [
  { key: "id_front", label: "Government ID (front)" },
  { key: "id_back", label: "Government ID (back)" },
  { key: "selfie", label: "Selfie with ID" },
  { key: "address_proof", label: "Proof of address" },
];

function KycPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const { data: docs } = useQuery({
    queryKey: ["kyc-docs", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("kyc_documents").select("*").order("created_at")).data ?? [],
  });

  async function submit() {
    if (!user) return;
    if ((docs?.length ?? 0) === 0) return toast.error("Upload at least one document.");
    await supabase.from("profiles").update({ kyc_status: "pending", kyc_rejection_reason: null }).eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("KYC submitted for review.");
  }

  const status = profile?.kyc_status ?? "not_submitted";
  const meta = {
    approved: { icon: ShieldCheck, cls: "bg-success/15 text-success", label: "Approved" },
    pending: { icon: ShieldQuestion, cls: "bg-warning/15 text-warning", label: "Pending review" },
    rejected: { icon: ShieldAlert, cls: "bg-destructive/15 text-destructive", label: "Rejected" },
    not_submitted: { icon: ShieldQuestion, cls: "bg-muted text-muted-foreground", label: "Not submitted" },
  }[status];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Identity verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload your documents to complete KYC.</p>
        </div>

        <Card className="flex items-center gap-3 border-border bg-card p-5">
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${meta.cls}`}><meta.icon className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="text-sm font-medium">Status: <Badge className={meta.cls + " border-transparent"}>{meta.label}</Badge></div>
            {profile?.kyc_rejection_reason && <div className="mt-1 text-xs text-destructive">{profile.kyc_rejection_reason}</div>}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {DOC_TYPES.map((d) => (
            <DocUploader key={d.key} docKey={d.key} label={d.label} existing={docs?.find((x) => x.doc_type === d.key) ?? null} />
          ))}
        </div>

        {status !== "approved" && status !== "pending" && (
          <Button onClick={submit} className="w-full gradient-primary text-primary-foreground">Submit for review</Button>
        )}
      </div>
    </AppShell>
  );
}

function DocUploader({ docKey, label, existing }: { docKey: string; label: string; existing: { id: string; storage_path: string } | null }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<string | null>(null);

  async function preview() {
    if (!existing) return;
    const { data } = await supabase.storage.from("kyc").createSignedUrl(existing.storage_path, 300);
    if (data) setSigned(data.signedUrl);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !user) return;
    setBusy(true);
    try {
      const path = `${user.id}/${docKey}-${Date.now()}-${f.name}`;
      const up = await supabase.storage.from("kyc").upload(path, f, { upsert: true });
      if (up.error) throw up.error;
      if (existing) {
        await supabase.storage.from("kyc").remove([existing.storage_path]);
        await supabase.from("kyc_documents").update({ storage_path: path }).eq("id", existing.id);
      } else {
        await supabase.from("kyc_documents").insert({ user_id: user.id, doc_type: docKey, storage_path: path });
      }
      toast.success(`${label} uploaded`);
      qc.invalidateQueries({ queryKey: ["kyc-docs", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <Card className="border-border bg-card p-4">
      <Label className="text-sm">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onFile} className="hidden" />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {existing ? "Replace" : "Upload"}
        </Button>
        {existing && <Button variant="ghost" size="sm" onClick={preview}>Preview</Button>}
      </div>
      {signed && <a href={signed} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-primary underline">Open document</a>}
    </Card>
  );
}
