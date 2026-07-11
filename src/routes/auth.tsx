import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { startSignup, startLogin, startReset } from "@/lib/auth-otp.functions";

const searchSchema = z.object({ mode: z.enum(["login", "register", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — International Digital" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [tab, setTab] = useState<"login" | "register" | "forgot">(mode ?? "login");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial-glow" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col justify-center py-10">
          <Card className="border-border bg-card/80 p-6 backdrop-blur-xl shadow-elegant animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-bold">Welcome</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in or create your account.</p>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
                <TabsTrigger value="forgot">Reset</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6"><LoginForm /></TabsContent>
              <TabsContent value="register" className="mt-6"><RegisterForm /></TabsContent>
              <TabsContent value="forgot" className="mt-6"><ForgotForm /></TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useServerFn(startLogin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ data: { email, password } });
      toast.success("We sent you a 6-digit code");
      navigate({ to: "/auth/verify", search: { email, purpose: "login" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></Field>
      <Field label="Password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
      <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue with email code
      </Button>
    </form>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", currency: "USD" as Currency });
  const [loading, setLoading] = useState(false);
  const signup = useServerFn(startSignup);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await signup({ data: form });
      toast.success("Check your email for a 6-digit verification code.");
      navigate({ to: "/auth/verify", search: { email: form.email, purpose: "signup" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Doe" /></Field>
      <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" /></Field>
      <Field label="Phone"><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" /></Field>
      <Field label="Account currency">
        <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as Currency })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
              <SelectItem key={c} value={c}>{CURRENCIES[c].flag} {c} — {CURRENCIES[c].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Password"><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></Field>
      <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Open my account
      </Button>
      <p className="text-center text-xs text-muted-foreground">By continuing you agree to our terms and privacy policy.</p>
    </form>
  );
}

function ForgotForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const reset = useServerFn(startReset);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await reset({ data: { email } });
      toast.success("If that email exists, we sent a 6-digit code.");
      navigate({ to: "/auth/verify", search: { email, purpose: "reset" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Enter your email — we'll send you a secure 6-digit code.</p>
      <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset code
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
