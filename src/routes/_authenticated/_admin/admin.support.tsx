import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/admin/support")({
  head: () => ({ meta: [{ title: "Admin · Support" }] }),
  component: AdminSupport,
});

function AdminSupport() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: threads } = useQuery({
    queryKey: ["admin-support-threads"],
    queryFn: async () => {
      const { data: msgs } = await supabase.from("support_messages").select("thread_user_id, body, created_at, read_by_admin, is_admin").order("created_at", { ascending: false });
      const map = new Map<string, { thread_user_id: string; last: string; when: string; unread: number }>();
      for (const m of msgs ?? []) {
        const cur = map.get(m.thread_user_id);
        if (!cur) map.set(m.thread_user_id, { thread_user_id: m.thread_user_id, last: m.body, when: m.created_at, unread: 0 });
        if (!m.read_by_admin && !m.is_admin) {
          const c = map.get(m.thread_user_id)!; c.unread += 1;
        }
      }
      const list = Array.from(map.values());
      const ids = list.map((l) => l.thread_user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("id,email,full_name").in("id", ids);
      return list.map((l) => ({ ...l, profile: profiles?.find((p) => p.id === l.thread_user_id) }));
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["admin-support-thread", activeThread], enabled: !!activeThread,
    queryFn: async () => (await supabase.from("support_messages").select("*").eq("thread_user_id", activeThread!).order("created_at")).data ?? [],
  });

  useEffect(() => {
    const ch = supabase.channel("admin-support-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-support-threads"] });
        if (activeThread) qc.invalidateQueries({ queryKey: ["admin-support-thread", activeThread] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeThread, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!activeThread) return;
    supabase.from("support_messages").update({ read_by_admin: true }).eq("thread_user_id", activeThread).eq("read_by_admin", false);
  }, [activeThread, messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeThread || !text.trim()) return;
    const body = text.trim(); setText("");
    await supabase.from("support_messages").insert({
      thread_user_id: activeThread, sender_user_id: user.id, is_admin: true, body,
    });
  }

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-border bg-card">
          <div className="border-b border-border/60 p-3 text-sm font-semibold">Threads</div>
          <ul className="max-h-[70vh] divide-y divide-border/60 overflow-y-auto">
            {(threads ?? []).map((t) => (
              <li key={t.thread_user_id}>
                <button onClick={() => setActiveThread(t.thread_user_id)} className={cn("w-full p-3 text-left text-sm hover:bg-accent", activeThread === t.thread_user_id && "bg-accent")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{t.profile?.full_name ?? t.profile?.email ?? "User"}</div>
                    {t.unread > 0 && <span className="rounded-full bg-primary px-2 text-[10px] text-primary-foreground">{t.unread}</span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.last}</div>
                </button>
              </li>
            ))}
            {threads?.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No threads yet.</li>}
          </ul>
        </Card>

        <Card className="flex h-[70vh] flex-col border-border bg-card">
          {!activeThread ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a thread</div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages?.map((m) => (
                  <div key={m.id} className={cn("flex", m.is_admin ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", m.is_admin ? "gradient-primary text-primary-foreground" : "bg-accent")}>
                      {m.body}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border/60 p-3">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" />
                <Button type="submit" className="gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
