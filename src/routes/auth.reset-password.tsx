import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — International Digital" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <Card className="relative w-full max-w-md border-border bg-card/80 p-8 backdrop-blur-xl shadow-elegant">
        <Logo className="mb-6" />
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password to secure your account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">New password</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm password</Label>
            <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
