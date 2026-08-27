import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { clearRegistrationDraft } from "@/lib/auth-flow";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirming your account — International Digital" },
      { name: "description", content: "Finishing email confirmation for your International Digital account." },
      { property: "og:title", content: "Confirming your account — International Digital" },
      { property: "og:description", content: "Finishing email confirmation for your International Digital account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const errDesc = url.searchParams.get("error_description") ?? hash.get("error_description");
      if (errDesc) {
        setError(errDesc);
        return;
      }

      // PKCE / code flow
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError(exchangeError.message);
          return;
        }
      }

      // token_hash (verify) flow
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (!code && tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as "signup" | "email" | "magiclink" | "recovery") ?? "signup",
        });
        if (verifyError && !cancelled) {
          setError(verifyError.message);
          return;
        }
      }

      // Implicit flow tokens are picked up automatically by the client; give it a tick.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        clearRegistrationDraft();
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/auth", search: { mode: "login" }, replace: true });
      }
    }

    void finish();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md border-border bg-card/80 p-8 text-center backdrop-blur-xl shadow-elegant">
        <Logo className="mb-6 justify-center" />
        {error ? (
          <>
            <h1 className="font-display text-xl font-bold">Confirmation link problem</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth", search: { mode: "login" } })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Confirming your account…</p>
          </>
        )}
      </Card>
    </div>
  );
}
