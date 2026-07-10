import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold tracking-tight">International</span>
          <span className="font-display text-[11px] font-medium tracking-[0.2em] text-muted-foreground">DIGITAL</span>
        </div>
      )}
    </div>
  );
}
