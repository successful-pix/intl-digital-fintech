import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { verifyOtp, resendOtp } from "@/lib/auth-otp.functions";
import { useEffect } from "react";
import { clearRegistrationDraft, resendCodeLabel, shouldRedirectToDashboard } from "@/lib/auth-flow";

const searchSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["signup", "login", "reset"]).default("signup"),
});

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Verify your email — International Digital" }] }),
  component: Verify,
});

function Verify() {
  const search = Route.useSearch();
  const email = search.email;
  const purpose = search.purpose as "signup" | "login" | "reset";
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"code" | "new-password">("code");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const verify = useServerFn(verifyOtp);
  const resend = useServerFn(resendOtp);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submitCode(codeVal: string) {
    setLoading(true);
    try {
      if (purpose === "reset") {
        // step 1: verify code only
        await verify({ data: { email, purpose, code: codeVal } });
        toast.success("Code verified. Set a new password.");
        setStep("new-password");
      } else {
        const res = await verify({ data: { email, purpose, code: codeVal } });
        if (shouldRedirectToDashboard(res)) {
          await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
          if (purpose === "signup") clearRegistrationDraft();
          toast.success(purpose === "signup" ? "Welcome to International Digital!" : "Signed in");
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw !== pw2) return toast.error("Passwords don't match.");
    setLoading(true);
    try {
      await verify({ data: { email, purpose: "reset", code, newPassword: pw } });
      toast.success("Password updated. You can now sign in.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  async function doResend() {
    if (cooldown > 0) return;
    try {
      await resend({ data: { email, purpose } });
      toast.success("New code sent");
      setCooldown(30);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend");
    }
  }

  const titles: Record<"signup" | "login" | "reset", string> = { signup: "Verify your email", login: "Confirm it's you", reset: "Reset your password" };
  const subtitles: Record<"signup" | "login" | "reset", string> = {
    signup: "Enter the 6-digit code we sent to activate your account.",
    login: "For your security we sent a 6-digit code to your email.",
    reset: "Enter the 6-digit code from your email.",
  };


  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial-glow" />
      <Card className="relative w-full max-w-md border-border bg-card/80 p-8 backdrop-blur-xl shadow-elegant animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Link to="/auth" search={{ mode: purpose === "signup" ? "register" : purpose === "reset" ? "forgot" : "login" }} className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" />{purpose === "signup" ? "Back to registration" : "Back"}</Link>
        <Logo className="mb-6" />
        <h1 className="font-display text-2xl font-bold">{titles[purpose]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitles[purpose]} <span className="text-foreground">{email}</span></p>

        {step === "code" ? (
          <>
            <div className="mt-8 flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={submitCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={() => submitCode(code)} disabled={loading || code.length < 6} className="mt-8 w-full gradient-primary text-primary-foreground">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify
            </Button>
            <button type="button" onClick={doResend} disabled={cooldown > 0} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed">
              {resendCodeLabel(cooldown)}
            </button>
          </>
        ) : (
          <form onSubmit={submitNewPassword} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label className="text-xs">New password</Label><Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Confirm password</Label><Input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
