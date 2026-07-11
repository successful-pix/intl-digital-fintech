import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield, Zap, Globe2, Lock, CheckCircle2, Star, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CURRENCIES } from "@/lib/currency";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "International Digital — Modern Multi-Currency Banking" },
      { name: "description", content: "Hold, send and receive USD, CAD, VND and BRL. Bank-grade security, instant transfers, and a beautiful modern experience." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Currencies />
      <Features />
      <Security />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
          <a href="#currencies" className="text-sm text-muted-foreground hover:text-foreground">Currencies</a>
          <a href="#security" className="text-sm text-muted-foreground hover:text-foreground">Security</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-glow">
            <Link to="/auth" search={{ mode: "register" } as never}>Open account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-radial-glow" />
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Now supporting USD, CAD, VND and BRL
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            Banking without <span className="gradient-text">borders</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            A premium multi-currency account for a global life. Send money instantly, hold four currencies, and stay in control — all in one beautiful app.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow">
              <Link to="/auth" search={{ mode: "register" } as never}>Open your account <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline"><a href="#features">Explore features</a></Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />256-bit encryption</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Transfer PIN protected</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Instant internal transfers</span>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-elegant">
            <div className="rounded-xl bg-gradient-to-br from-background to-accent/30 p-8">
              <div className="grid gap-4 md:grid-cols-4">
                {(Object.keys(CURRENCIES) as (keyof typeof CURRENCIES)[]).map((c) => (
                  <div key={c} className="rounded-xl border border-border bg-card/80 p-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{CURRENCIES[c].flag} {c}</span>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">Available</span>
                    </div>
                    <div className="mt-3 font-display text-xl font-semibold">{CURRENCIES[c].label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Hold, send & receive in {c}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function Currencies() {
  return (
    <section id="currencies" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHead eyebrow="Multi-currency" title="Four currencies. One account." subtitle="Choose your primary account currency when you register. Add more as we launch them." />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(CURRENCIES) as (keyof typeof CURRENCIES)[]).map((code) => {
          const c = CURRENCIES[code];
          return (
            <Card key={code} className="group relative overflow-hidden border-border bg-card/60 p-6 transition hover:border-primary/40 hover:shadow-glow">
              <div className="text-4xl">{c.flag}</div>
              <div className="mt-4 font-display text-2xl font-bold">{code}</div>
              <div className="text-sm text-muted-foreground">{c.label}</div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-primary">{c.symbol}</span>
                <span className="text-sm text-muted-foreground">symbol</span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Zap, title: "Instant transfers", body: "Send money to any International Digital account in seconds — no waiting, no fees." },
    { icon: Shield, title: "Bank-grade security", body: "256-bit encryption, session monitoring, device management and transfer PIN." },
    { icon: Globe2, title: "Multi-currency", body: "Hold USD, CAD, VND or BRL with real-time balances and clean receipts." },
    { icon: DollarSign, title: "Beautiful receipts", body: "Professional PDF receipts for every transaction, ready to download or print." },
    { icon: Lock, title: "KYC verification", body: "Simple, secure identity verification with document upload and status tracking." },
    { icon: CheckCircle2, title: "Live support", body: "Chat with our team from any screen. Real-time messaging with full history." },
  ];
  return (
    <section id="features" className="border-y border-border/60 bg-accent/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Features" title="Everything you need. Nothing you don't." />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <Card key={f.title} className="border-border bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-lg gradient-primary text-primary-foreground shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section id="security" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Security" title="Your money. Guarded like ours." align="left" />
          <ul className="mt-8 space-y-4">
            {[
              "Email OTP verification on every new account",
              "Transfer PIN required to authorize outgoing money movement",
              "Device management and active session monitoring",
              "Encrypted file storage for KYC and personal documents",
              "Role-based access with strict server-side authorization",
            ].map((s) => (
              <li key={s} className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-foreground/90">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <Card className="relative overflow-hidden border-border bg-card p-8">
          <div className="absolute inset-0 bg-radial-glow opacity-40" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-border bg-background/60 px-3 py-1 text-xs">Live security status</div>
            <div className="mt-6 grid gap-4">
              {[
                ["Encryption", "AES-256"],
                ["Compliance", "PCI-DSS aligned"],
                ["Uptime SLA", "99.95%"],
                ["Data residency", "Multi-region"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-border/60 pb-3 text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { name: "Amelia N.", role: "Freelance designer", body: "Finally an account that treats CAD and USD as equals. Transfers are instant and receipts look phenomenal." },
    { name: "Rafael S.", role: "Small business owner", body: "I hold BRL for my suppliers and USD for clients. The dashboard makes everything feel effortless." },
    { name: "Linh P.", role: "Product manager", body: "The onboarding was smooth — email OTP, KYC, done. Best fintech experience I've used." },
  ];
  return (
    <section className="border-y border-border/60 bg-accent/20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHead eyebrow="Loved" title="Trusted by a global community" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {t.map((x) => (
            <Card key={x.name} className="border-border bg-card p-6">
              <div className="flex gap-0.5 text-primary">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="mt-4 text-sm leading-relaxed">"{x.body}"</p>
              <div className="mt-6 text-sm"><div className="font-medium">{x.name}</div><div className="text-muted-foreground">{x.role}</div></div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const q = [
    ["Which currencies do you support?", "USD, CAD, VND and BRL. You choose your primary account currency at registration."],
    ["How are my funds secured?", "Bank-grade encryption, transfer PINs, session monitoring, and strict server-side role authorization."],
    ["Do I need to verify my identity?", "Yes. KYC is required — upload a government ID and (optionally) a selfie from your profile."],
    ["Is there a fee for internal transfers?", "No. Transfers between International Digital accounts are always free."],
    ["Can I get a receipt for every transaction?", "Yes — a professional PDF receipt with reference, balance and status, ready to download or print."],
  ];
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHead eyebrow="FAQ" title="Answers, straight up." />
      <Accordion type="single" collapsible className="mt-8">
        {q.map(([question, answer]) => (
          <AccordionItem key={question} value={question} className="border-border">
            <AccordionTrigger className="text-left">{question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <Card className="relative overflow-hidden border-border bg-card p-10 text-center">
        <div className="absolute inset-0 bg-radial-glow opacity-50" />
        <div className="relative">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to bank without borders?</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Open your account in minutes. Verify your email, complete KYC, and start moving money.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow">
              <Link to="/auth" search={{ mode: "register" } as never}>Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="outline"><a href="mailto:support@internationaldigital.app">Contact support</a></Button>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <Logo />
        <div>© {new Date().getFullYear()} International Digital. All rights reserved.</div>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, subtitle, align = "center" }: { eyebrow: string; title: string; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
