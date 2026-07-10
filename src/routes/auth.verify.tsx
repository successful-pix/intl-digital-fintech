import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ email: z.string().email() });

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Verify your email — International Digital" }] }),
  component: Verify,
});

function Verify() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(codeVal: string) {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: codeVal, type: "signup" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email verified — welcome!");
    navigate({ to: "/dashboard" });
  }

  async function resend() {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return toast.error(error.message);
    toast.success("New code sent to your email.");
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-radial-glow" />
      <Card className="relative w-full max-w-md border-border bg-card/80 p-8 backdrop-blur-xl shadow-elegant">
        <Link to="/auth" className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" />Back</Link>
        <Logo className="mb-6" />
        <h1 className="font-display text-2xl font-bold">Verify your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code sent to <span className="text-foreground">{email}</span>.</p>
        <div className="mt-8 flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={submit}>
            <InputOTPGroup>
              {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button onClick={() => submit(code)} disabled={loading || code.length < 6} className="mt-8 w-full gradient-primary text-primary-foreground">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify
        </Button>
        <button type="button" onClick={resend} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">Didn't get it? Resend code</button>
      </Card>
    </div>
  );
}
