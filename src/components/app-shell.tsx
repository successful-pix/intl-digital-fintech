import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LayoutDashboard, LogOut, Menu, User as UserIcon, ArrowLeftRight, Receipt, ShieldCheck, Shield, IdCard, ArrowDownLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/use-session";
import { SupportWidget } from "@/components/support-widget";
import { LanguageSelector } from "@/components/language-selector";


const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/deposits", label: "Deposit history", icon: ArrowDownLeft },
  { to: "/kyc", label: "Verification", icon: IdCard },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/security", label: "Security", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  // Global realtime → invalidate relevant caches + toast
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`user-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as { title: string; body: string | null };
          toast(n.title, { description: n.body ?? undefined });
          qc.invalidateQueries({ queryKey: ["notif-unread", user.id] });
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          qc.invalidateQueries({ queryKey: ["notif-latest", user.id] });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notif-unread", user.id] });
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        qc.invalidateQueries({ queryKey: ["notif-latest", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        qc.invalidateQueries({ queryKey: ["recent-tx"] });
        qc.invalidateQueries({ queryKey: ["all-tx"] });
        qc.invalidateQueries({ queryKey: ["accounts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarBody isAdmin={!!isAdmin} />
      </aside>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-64 border-border bg-sidebar p-0"><SidebarBody isAdmin={!!isAdmin} onNav={() => setOpenMobile(false)} /></SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <Topbar onOpenMobile={() => setOpenMobile(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <BlockedBanner />
          <div className="animate-in fade-in duration-300">{children}</div>
        </main>
      </div>
      <MobileTabBar onOpenMore={() => setOpenMobile(true)} />
      <SupportWidget />
    </div>
  );
}

const tabItems = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/transactions", label: "Activity", icon: Receipt },
  { to: "/notifications", label: "Alerts", icon: Bell },
] as const;

function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-safe backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {tabItems.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link key={item.to} to={item.to}
              className={cn("flex min-h-16 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <item.icon className={cn("h-5 w-5", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
        <button onClick={onOpenMore}
          className="flex min-h-16 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition hover:text-foreground">
          <Menu className="h-5 w-5" strokeWidth={2} />
          More
        </button>
      </div>
    </nav>
  );
}

function BlockedBanner() {
  const { user } = useSession();
  const { data: acct } = useQuery({
    queryKey: ["my-acct-status", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("status").eq("user_id", user!.id).maybeSingle()).data,
  });
  if (acct?.status !== "suspended") return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <Shield className="h-4 w-4 shrink-0" />
      <div className="flex-1"><strong>Account blocked.</strong> Please contact support to unlock your account — tap the chat button in the corner.</div>
    </div>
  );
}


function SidebarBody({ onNav, isAdmin }: { onNav?: () => void; isAdmin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-5"><Logo /></div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link key={item.to} to={item.to} onClick={onNav}
              className={cn("group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}>
              <item.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" onClick={onNav}
            className={cn("mt-4 flex items-center gap-3 rounded-xl border border-primary/30 px-3.5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10")}>
            <Shield className="h-[18px] w-[18px]" />Admin
          </Link>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">© International Digital</div>
    </>
  );
}

function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread", user?.id], enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  const { data: latest = [] } = useQuery({
    queryKey: ["notif-latest", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name,avatar_url,email").eq("id", user!.id).maybeSingle()).data,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notif-unread", user.id] });
    qc.invalidateQueries({ queryKey: ["notif-latest", user.id] });
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  }

  async function openNotification(id: string, read: boolean) {
    if (!user || read) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
    qc.setQueryData(["notif-unread", user.id], (count: number | undefined) => Math.max((count ?? 1) - 1, 0));
    qc.invalidateQueries({ queryKey: ["notif-latest", user.id] });
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  }

  const initials = (profile?.full_name ?? profile?.email ?? "?").split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobile}><Menu className="h-5 w-5" /></Button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageSelector />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border/60 p-3">
              <div className="text-sm font-semibold">Notifications</div>
              <Button variant="ghost" size="sm" onClick={markAll}>Mark read</Button>
            </div>
            <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
              {latest.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</li>}
              {latest.map((n) => (
                <li key={n.id} onClick={() => openNotification(n.id, n.read)} className={cn("cursor-pointer p-3 text-sm", !n.read && "bg-primary/[0.04]")}>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border/60 p-2 text-center">
              <Button asChild variant="ghost" size="sm" className="w-full"><Link to="/notifications">View all</Link></Button>
            </div>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent">
              <Avatar className="h-8 w-8"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs">
              <div className="font-medium">{profile?.full_name ?? "Account"}</div>
              <div className="text-muted-foreground">{profile?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/security"><ShieldCheck className="mr-2 h-4 w-4" />Security</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/kyc"><IdCard className="mr-2 h-4 w-4" />Verification</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success/15 text-success",
    successful: "bg-success/15 text-success",
    approved: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    not_submitted: "bg-muted text-muted-foreground",
    failed: "bg-destructive/15 text-destructive",
    rejected: "bg-destructive/15 text-destructive",
    suspended: "bg-destructive/15 text-destructive",
  };
  return <Badge className={cn("border-transparent capitalize", map[status] ?? "bg-muted text-muted-foreground")}>{status.replace("_"," ")}</Badge>;
}
