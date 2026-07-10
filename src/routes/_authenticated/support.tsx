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

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — International Digital" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["support", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("support_messages").select("*")
      .eq("thread_user_id", user!.id).order("created_at")).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`support-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["support", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const body = text.trim();
    setText("");
    await supabase.from("support_messages").insert({
      thread_user_id: user.id, sender_user_id: user.id, is_admin: false, body,
    });
  }

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold sm:text-3xl">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chat with our team in real time.</p>
        </div>
        <Card className="flex flex-1 flex-col border-border bg-card">
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            {(messages?.length ?? 0) === 0 && (
              <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">Send us a message to get started.</div>
            )}
            {messages?.map((m) => (
              <div key={m.id} className={cn("flex", m.is_admin ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  m.is_admin ? "bg-accent" : "gradient-primary text-primary-foreground")}>
                  {m.body}
                  <div className={cn("mt-1 text-[10px]", m.is_admin ? "text-muted-foreground" : "text-primary-foreground/70")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border/60 p-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <Button type="submit" className="gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
