import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { resendCodeLabel } from "@/lib/auth-flow";

const searchSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["signup", "login", "reset"]).default("signup"),
});

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Confirm your email — International Digital" },
      { name: "description", content: "Confirm your email address to activate your International Digital account." },
      { property: "og:title", content: "Confirm your email — International Digital" },
      { property: "og:description", content: "One last step to activate your International Digital account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verify,
});

function Verify() {
  const { email } = Route.useSearch();
  const [cooldown, setCooldown] = useState(30);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (cooldown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast.success("Confirmation email sent again");
      setCooldown(30);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend the email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial-glow" />
      <Card className="relative w-full max-w-md border-border bg-card/80 p-8 backdrop-blur-xl shadow-elegant animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Link to="/auth" search={{ mode: "login" }} className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
        <Logo className="mb-6" />
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it on this device to activate your
          account — you'll land straight in your dashboard.
        </p>
        <ul className="mt-6 space-y-2 rounded-2xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
          <li>• The link expires in 24 hours.</li>
          <li>• Check your spam or promotions folder if it hasn't arrived.</li>
          <li>• Already confirmed? Just sign in with your email and password.</li>
        </ul>
        <Button onClick={resend} disabled={cooldown > 0 || sending} variant="outline" className="mt-6 w-full">
          {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {cooldown > 0 ? resendCodeLabel(cooldown).replace("code", "email") : "Resend confirmation email"}
        </Button>
        <Button asChild className="mt-3 w-full gradient-primary text-primary-foreground">
          <Link to="/auth" search={{ mode: "login" }}>I've confirmed — sign in</Link>
        </Button>
      </Card>
    </div>
  );
}
