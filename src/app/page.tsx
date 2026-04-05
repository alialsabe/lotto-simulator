"use client";

import { useState, useEffect } from "react";
import { calculateLotto, JACKPOT_ODDS } from "@/lib/lotto";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

const ODDS_COMPARISONS = [
  { label: "Dying in a plane crash", odds: "1 in 11,000,000" },
  { label: "Being struck by lightning", odds: "1 in 1,200,000" },
  { label: "Winning Powerball jackpot", odds: `1 in ${JACKPOT_ODDS.toLocaleString()}` },
];

export default function Home() {
  const [weeklySpend, setWeeklySpend] = useState(20);
  const [yearsPlayed, setYearsPlayed] = useState(10);
  const [result, setResult] = useState<ReturnType<typeof calculateLotto> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setResult(calculateLotto({ weeklySpend, yearsPlayed }));
  }, [weeklySpend, yearsPlayed]);

  if (!mounted || !result) return <LoadingSkeleton />;

  const chartData = result.yearlyLabels.map((label, i) => ({
    name: label,
    burned: result.yearlyBurn[i],
    saved: result.yearlyBurn[i] > 0 ? Math.round(result.yearlyBurn[i] * 1.1 ** (i + 1)) : 0,
  }));

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      {/* HERO */}
      <section className="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="text-xs font-mono text-[#c9a227] uppercase tracking-widest mb-4">
          The math doesn't lie
        </div>
        <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
          You're more likely to{" "}
          <span className="text-[#dc143c]">die in a plane crash</span>{" "}
          than win the jackpot.
        </h1>
        <p className="text-[#888888] text-lg">
          But that doesn't stop people from spending. Let's see what it's actually costing you.
        </p>
      </section>

      {/* CALCULATOR */}
      <section className="max-w-xl mx-auto px-6 mb-20">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a]">
          <h2 className="text-xl font-bold mb-6">What are you actually spending?</h2>

          <div className="space-y-6">
            {/* Weekly Spend */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-[#888888]">Weekly lottery spend</label>
                <span className="font-mono text-2xl font-bold text-[#dc143c]">
                  ${weeklySpend}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                value={weeklySpend}
                onChange={(e) => setWeeklySpend(Number(e.target.value))}
                className="w-full h-2 bg-[#2a2a2a] rounded-full appearance-none cursor-pointer accent-[#dc143c]"
              />
              <div className="flex justify-between text-xs text-[#888888] mt-1">
                <span>$0</span>
                <span>$200/week = ${(weeklySpend * 52).toLocaleString()}/year</span>
              </div>
            </div>

            {/* Years Played */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-[#888888]">Years playing</label>
                <span className="font-mono text-2xl font-bold text-[#dc143c]">
                  {yearsPlayed} {yearsPlayed === 1 ? "year" : "years"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={yearsPlayed}
                onChange={(e) => setYearsPlayed(Number(e.target.value))}
                className="w-full h-2 bg-[#2a2a2a] rounded-full appearance-none cursor-pointer accent-[#dc143c]"
              />
              <div className="flex justify-between text-xs text-[#888888] mt-1">
                <span>1 year</span>
                <span>50 years</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE VERDICT */}
      <section className="max-w-2xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-2 gap-4">
          <VerdictCard
            label="Total burned"
            value={`$${result.totalSpent.toLocaleString()}`}
            subtext={`${result.totalTickets.toLocaleString()} tickets`}
            color="crimson"
          />
          <VerdictCard
            label="Expected wins"
            value={result.expectedWins < 0.00001 ? "< 1" : result.expectedWins.toFixed(4)}
            subtext="at current odds"
            color="muted"
          />
          <VerdictCard
            label="Debt payoff"
            value={`${result.debtPayoffMonths} mo`}
            subtext="if redirected"
            color="green"
          />
          <VerdictCard
            label="If saved & invested"
            value={`$${result.savingsGrowth.toLocaleString()}`}
            subtext={`${yearsPlayed}yr S&P500`}
            color="gold"
          />
        </div>
      </section>

      {/* CHART: THE TIMELINE */}
      <section className="max-w-2xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-black mb-2">What this money could do</h2>
        <p className="text-[#888888] text-sm mb-6">
          Money burned vs. if you'd invested it at 10% annual return
        </p>

        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={0}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#888888", fontSize: 11 }}
                axisLine={{ stroke: "#2a2a2a" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#888888", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 8,
                  color: "#f5f5f5",
                }}
                formatter={(v: number, name: string) => [
                  `$${v.toLocaleString()}`,
                  name === "burned" ? "Money burned" : "If invested",
                ]}
              />
              <Bar dataKey="burned" fill="#8b0000" radius={[2, 2, 0, 0]}>
                <LabelList
                  dataKey="burned"
                  position="top"
                  style={{ fill: "#dc143c", fontSize: 10, fontFamily: "monospace" }}
                  formatter={(v: number) => (v > 0 ? `$${(v / 1000).toFixed(0)}k` : "")}
                />
              </Bar>
              <Bar dataKey="saved" fill="#2e8b57" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex gap-6 mt-4 justify-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#8b0000]" />
              <span className="text-[#888888]">Burned on lotto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#2e8b57]" />
              <span className="text-[#888888]">Invested instead</span>
            </div>
          </div>
        </div>
      </section>

      {/* ODDS LADDER */}
      <section className="max-w-2xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-black mb-2">How unlikely is the jackpot?</h2>
        <p className="text-[#888888] text-sm mb-6">
          Compare lottery odds to things people fear — but actually happen less.
        </p>

        <div className="space-y-3">
          {ODDS_COMPARISONS.map((item, i) => {
            const oddsNum = parseFloat(item.odds.replace(/[^0-9.]/g, ""));
            const maxOdds = JACKPOT_ODDS;
            const width = Math.min(100, Math.max(5, (oddsNum / maxOdds) * 100));
            const colors = ["#2e8b57", "#c9a227", "#8b0000"];
            return (
              <div key={item.label} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="font-mono text-xs text-[#888888]">{item.odds}</span>
                </div>
                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${width}%`, backgroundColor: colors[i] }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-[#1a1a1a] rounded-xl p-4 border border-[#c9a227]/30">
          <p className="text-sm text-[#888888]">
            <span className="text-[#c9a227] font-bold">Here's what {result.oddsText} actually means:</span>{" "}
            Imagine filling a swimming pool with grains of rice. One single grain is the winner.
            You'd need to search through{" "}
            <span className="text-white font-mono">{result.cupComparison}</span> to find it.
          </p>
        </div>
      </section>

      {/* THE CHOICE */}
      <section className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a8b57]">
          <h2 className="text-2xl font-black text-[#2e8b57] mb-4">
            The only win is knowing the odds.
          </h2>
          <p className="text-[#888888]">
            Every dollar you don't spend on a lottery ticket is a dollar toward something real.
            The house always wins. The only way to beat them is not to play.
          </p>
        </div>
      </section>
    </main>
  );
}

function VerdictCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  color: "crimson" | "green" | "gold" | "muted";
}) {
  const colorMap = {
    crimson: "text-[#dc143c] border-[#8b0000]",
    green: "text-[#2e8b57] border-[#2e8b57]",
    gold: "text-[#c9a227] border-[#c9a227]",
    muted: "text-[#888888] border-[#3a3a3a]",
  };
  const borderColor = colorMap[color];

  return (
    <div className={`bg-[#1a1a1a] rounded-xl p-4 border ${borderColor} border-opacity-50`}>
      <div className="text-xs text-[#888888] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-2xl font-black truncate">{value}</div>
      <div className="text-xs text-[#888888] mt-1">{subtext}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex items-center justify-center">
      <div className="text-[#888888] font-mono text-sm">Loading...</div>
    </main>
  );
}
