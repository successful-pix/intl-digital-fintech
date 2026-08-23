import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { LanguageSelector } from "@/components/language-selector";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — International Digital" }] }),
  component: Profile,
});

function Profile() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Profile & Security</h1>
          <p className="text-sm text-muted-foreground">Manage your account details, password and transfer PIN.</p>
        </div>
        <BankDetails />
        <LanguageCard />
        <Tabs defaultValue="profile">
          <TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="password">Password</TabsTrigger><TabsTrigger value="pin">Transfer PIN</TabsTrigger></TabsList>
          <TabsContent value="profile" className="mt-6"><ProfileForm /></TabsContent>
          <TabsContent value="password" className="mt-6"><PasswordForm /></TabsContent>
          <TabsContent value="pin" className="mt-6"><PinForm /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function LanguageCard() {
  return (
    <Card className="border-border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Language</div>
          <div className="text-xs text-muted-foreground">Choose the language used across your account.</div>
        </div>
        <LanguageSelector />
      </div>
    </Card>
  );
}

function BankDetails() {
  const { user } = useSession();
  const { data: accounts } = useQuery({
    queryKey: ["my-accounts", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("*").eq("user_id", user!.id)).data ?? [],
  });
  if (!accounts || accounts.length === 0) return null;
  const LABELS: Record<string, { agency: string; account: string; extra?: string }> = {
    USD: { agency: "Routing (ABA)", account: "Account number", extra: "SWIFT: IDGLUS33" },
    CAD: { agency: "Transit / Institution", account: "Account number", extra: "SWIFT: IDGLCATT" },
    VND: { agency: "Branch code", account: "Account number", extra: "SWIFT: IDGLVNVX" },
    BRL: { agency: "Agência", account: "Conta", extra: "PIX (email): use your login email" },
  };
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); } catch { toast.error("Copy failed"); }
  }
  return (
    <Card className="border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Your banking details</div>
          <div className="text-xs text-muted-foreground">Share these with senders to receive funds.</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((a) => {
          const L = LABELS[a.currency] ?? LABELS.USD;
          return (
            <div key={a.id} className="rounded-lg border border-border/60 bg-accent/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{a.currency}</span>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">Active</span>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{L.agency}</dt>
                  <dd className="font-mono cursor-pointer" onClick={() => copy(a.agency_code ?? "", L.agency)}>{a.agency_code ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{L.account}</dt>
                  <dd className="font-mono cursor-pointer" onClick={() => copy(a.account_number, L.account)}>{a.account_number}</dd>
                </div>
                {L.extra && <div className="pt-1 text-[11px] text-muted-foreground">{L.extra}</div>}
              </dl>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ProfileForm() {
  const { user } = useSession();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // sync when profile arrives
  if (profile && form.full_name === "" && form.phone === "") {
    if (profile.full_name || profile.phone) {
      queueMicrotask(() => setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" }));
    }
  }
  if (profile?.avatar_url && avatarUrl === null) {
    supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    if (dbErr) { setUploading(false); return toast.error(dbErr.message); }
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(signed?.signedUrl ?? null);
    setUploading(false);
    toast.success("Photo updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  if (isLoading) return <Card className="p-6">Loading…</Card>;

  const initials = (profile?.full_name ?? profile?.email ?? "?").split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <Card className="border-border bg-card p-6">
      <div className="flex items-center gap-5">
        <Avatar className="h-20 w-20"><AvatarImage src={avatarUrl ?? undefined} /><AvatarFallback className="text-lg">{initials}</AvatarFallback></Avatar>
        <div>
          <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
            Upload photo
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">PNG or JPG, max 5MB.</p>
        </div>
      </div>
      <form onSubmit={save} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label className="text-xs">Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={profile?.email ?? ""} disabled /></div>
        <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPw({ next: "", confirm: "" });
    toast.success("Password updated");
  }

  return (
    <Card className="border-border bg-card p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label className="text-xs">New password</Label><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Confirm password</Label><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={8} /></div>
        <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password</Button>
      </form>
    </Card>
  );
}

function PinForm() {
  const { user } = useSession();
  const [pin, setPin] = useState({ next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin.next)) return toast.error("PIN must be 4–6 digits.");
    if (pin.next !== pin.confirm) return toast.error("PINs don't match.");
    if (!user) return;
    setLoading(true);
    // PIN is hashed and stored server-side; the hash is never exposed to the client.
    const { error } = await supabase.rpc("set_transfer_pin", { _pin: pin.next });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPin({ next: "", confirm: "" });
    toast.success("Transfer PIN updated");
  }

  return (
    <Card className="border-border bg-card p-6">
      <p className="mb-4 text-sm text-muted-foreground">Your transfer PIN authorizes outgoing transfers. Choose 4–6 digits.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label className="text-xs">New PIN</Label><Input inputMode="numeric" pattern="\d{4,6}" value={pin.next} onChange={(e) => setPin({ ...pin, next: e.target.value })} required /></div>
        <div className="space-y-1.5"><Label className="text-xs">Confirm PIN</Label><Input inputMode="numeric" pattern="\d{4,6}" value={pin.confirm} onChange={(e) => setPin({ ...pin, confirm: e.target.value })} required /></div>
        <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Set PIN</Button>
      </form>
    </Card>
  );
}
