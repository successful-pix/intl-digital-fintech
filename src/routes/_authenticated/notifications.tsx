import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — International Digital" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notif-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["notif-unread", user.id] });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">Real-time updates about your account.</p>
          </div>
          <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>
        </div>
        <Card className="border-border bg-card">
          {!data ? null : data.length === 0 ? (
            <div className="p-16 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-2 h-6 w-6" />You're all caught up.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 p-4 sm:p-5 ${!n.read ? "bg-primary/[0.03]" : ""}`}>
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" style={{ opacity: n.read ? 0.2 : 1 }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
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
