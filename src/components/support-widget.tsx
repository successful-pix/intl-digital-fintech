import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Send, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

type SupportMessage = {
  id: string;
  thread_user_id: string;
  is_admin: boolean;
  body: string | null;
  image_url: string | null;
  read_by_user: boolean;
  created_at: string;
};

export function SupportWidget() {
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Hide on the dedicated /support page (it has its own full-screen chat).
  const hideOn = pathname.startsWith("/support") || pathname.startsWith("/auth") || pathname.startsWith("/admin");

  const { data: unread = 0 } = useQuery({
    queryKey: ["support-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("support_unread_for_user", { _user_id: user!.id });
      return data ?? 0;
    },
    refetchInterval: 30_000,
  });

  const { data: messages = [] } = useQuery<SupportMessage[]>({
    queryKey: ["support-widget", user?.id],
    enabled: !!user && open,
    queryFn: async () => (await supabase.from("support_messages").select("*")
      .eq("thread_user_id", user!.id).order("created_at").limit(40)).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`sw-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["support-unread", user.id] });
        qc.invalidateQueries({ queryKey: ["support-widget", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [open, messages.length]);

  // Mark admin messages as read when opening.
  useEffect(() => {
    if (!open || !user) return;
    void supabase.from("support_messages").update({ read_by_user: true })
      .eq("thread_user_id", user.id).eq("is_admin", true).eq("read_by_user", false).then(() => {
        qc.invalidateQueries({ queryKey: ["support-unread", user.id] });
      });
  }, [open, user, qc]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const body = text.trim();
    setText("");
    await supabase.from("support_messages").insert({
      thread_user_id: user.id, sender_user_id: user.id, is_admin: false, body,
    });
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-z0-9._-]/gi, "_")}`;
      const up = await supabase.storage.from("support-images").upload(path, f, { upsert: false });
      if (up.error) throw up.error;
      const { data } = await supabase.storage.from("support-images").createSignedUrl(path, 60 * 60 * 24 * 30);
      await supabase.from("support_messages").insert({
        thread_user_id: user.id, sender_user_id: user.id, is_admin: false, body: "", image_url: data?.signedUrl,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!user || hideOn) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-[9999] grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow transition hover:scale-105 active:scale-95"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground ring-2 ring-background animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div
        className={cn(
          "fixed bottom-24 right-5 z-[9999] w-[calc(100vw-2.5rem)] max-w-sm origin-bottom-right rounded-2xl border border-border bg-card shadow-elegant transition-all duration-200 ease-out",
          open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Support</div>
            <div className="text-xs text-muted-foreground">We usually reply within minutes</div>
          </div>
          <Button asChild variant="ghost" size="sm"><Link to="/support" onClick={() => setOpen(false)}>Full view</Link></Button>
        </div>
        <div className="h-80 space-y-2 overflow-y-auto p-3">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">Say hello — a real person will reply.</div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.is_admin ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                m.is_admin ? "bg-accent" : "gradient-primary text-primary-foreground")}>
                {m.image_url && <img src={m.image_url} alt="" className="mb-1 max-h-40 rounded-lg" />}
                {m.body}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-1.5 border-t border-border/60 p-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
          <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </Button>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1" />
          <Button type="submit" size="icon" className="gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </>
  );
}
