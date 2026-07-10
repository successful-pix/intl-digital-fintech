import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, LayoutDashboard, LifeBuoy, LogOut, Menu, User as UserIcon, ArrowLeftRight, Receipt, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/use-session";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/security", label: "Security", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <SidebarBody />
      </aside>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-64 border-border bg-sidebar p-0"><SidebarBody onNav={() => setOpenMobile(false)} /></SheetContent>
      </Sheet>
      <div className="lg:pl-60">
        <Topbar onOpenMobile={() => setOpenMobile(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <SupportFAB />
    </div>
  );
}

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-5"><Logo /></div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link key={item.to} to={item.to} onClick={onNav}
              className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}>
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground">© International Digital</div>
    </>
  );
}

function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const navigate = useNavigate();
  const { user } = useSession();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notif-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name,avatar_url,email").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  const initials = (profile?.full_name ?? profile?.email ?? "?").split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobile}><Menu className="h-5 w-5" /></Button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
        </Button>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function SupportFAB() {
  return (
    <button
      onClick={() => toast.info("Support chat is coming soon.")}
      className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground shadow-elegant transition hover:scale-105"
      aria-label="Support">
      <LifeBuoy className="h-6 w-6" />
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success/15 text-success",
    successful: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    failed: "bg-destructive/15 text-destructive",
    suspended: "bg-destructive/15 text-destructive",
  };
  return <Badge className={cn("border-transparent capitalize", map[status] ?? "bg-muted text-muted-foreground")}>{status}</Badge>;
}
