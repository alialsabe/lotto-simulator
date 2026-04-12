import Link from "next/link";
import { ReactNode } from "react";
import { ParticlesBackground } from "@/components/ui/particles-bg";
import { FloatingMathSymbols } from "@/components/ui/floating-math";

interface SiteShellProps {
  children: ReactNode;
  active?: "lotto" | "blackjack" | "roulette" | "scratchers";
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
        active
          ? "border-[#ffd700] bg-[#ffd700]/10 text-[#ffd700]"
          : "border-[#2e2560] bg-[#1e1535]/70 text-[#6b6b8a] hover:border-[#4a3d86] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteShell({ children, active = "lotto" }: SiteShellProps) {
  return (
    <main className="min-h-screen bg-[#030014] text-[#f0f0f0] relative overflow-hidden">
      <ParticlesBackground />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
        <FloatingMathSymbols />
      </div>

      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,0,20,0.32) 0%, rgba(3,0,20,0.06) 28%, rgba(3,0,20,0.96) 85%, #030014 100%)",
        }}
      />

      <div className="relative z-20 max-w-5xl mx-auto px-6 pt-8 pb-16">
        <nav className="flex justify-center gap-3 mb-8 flex-wrap">
          <NavLink href="/" label="Lottery" active={active === "lotto"} />
          <NavLink href="/blackjack" label="Blackjack" active={active === "blackjack"} />
          <NavLink href="/roulette" label="Roulette" active={active === "roulette"} />
          <NavLink href="/scratchers" label="Scratchers" active={active === "scratchers"} />
        </nav>
        {children}
      </div>
    </main>
  );
}
