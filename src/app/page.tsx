"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateLotto } from "@/lib/lotto";
import { runSimulation, calculateExpected, type SimResult } from "@/lib/simulation";
import { POWERBALL, MEGA_MILLIONS, type LotteryGame } from "@/lib/lottery-data";
import { SiteShell } from "@/components/site-shell";

function MonteCarloInfo() {
  return (
    <span className="relative group inline-flex items-center ml-2 cursor-help">
      <span className="w-5 h-5 rounded-full border border-[#6b6b8a]/50 text-[#6b6b8a] text-xs font-bold flex items-center justify-center hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors">
        i
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-[#0f0a1e] border border-[#1e1535] text-xs text-[#b0b0c8] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
        A Monte Carlo simulation runs thousands of random trials to model the probability of different outcomes when randomness is involved. Instead of relying on a single expected-value number, it plays out full scenarios — here, thousands of players gambling over years — to show the real range of results, from lucky streaks to devastating losses.
        {" "}
        <a
          href="https://en.wikipedia.org/wiki/Monte_Carlo_method"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7c3aed] underline pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          Learn more on Wikipedia →
        </a>
      </span>
    </span>
  );
}
import AnimatedTextCycle from "@/components/ui/animated-text-cycle";
import { Button } from "@/components/ui/button";

function currencyCompact(value: number) {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${prefix}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}$${Math.round(abs / 1_000)}K`;
  return `${prefix}$${Math.round(abs).toLocaleString()}`;
}

function sliderFill(value: number, min: number, max: number, color: string) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return {
    backgroundImage: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #241a40 ${pct}%, #241a40 100%)`,
    backgroundColor: "transparent",
  };
}

function MonteCarloResults({ sim }: { sim: SimResult }) {
  const bandColors = ["#6d28d9", "#2563eb", "#14b8a6", "#f59e0b"];

  return (
    <section className="max-w-xl mx-auto px-6 mb-12">
      <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#7c3aed]/40">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#7c3aed]">
              {sim.params.trials.toLocaleString()} Players Simulated
            </h2>
            <p className="text-[#6b6b8a] text-sm mt-1">
              {sim.params.game.name} · ${sim.params.weeklySpend.toLocaleString()}/wk · {sim.params.yearsPlayed} years
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-black text-[#ff2040]">
              {currencyCompact(sim.avgLossPerPlayer)}
            </div>
            <div className="text-xs text-[#6b6b8a]">avg net per player</div>
          </div>
        </div>

        <div className="mb-6 h-72 w-full rounded-xl border border-[#1e1535] bg-[#030014] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sim.outcomeBands} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
              <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" horizontal={false} vertical />
              <XAxis type="number" stroke="#6b6b8a" tickFormatter={(v) => `${v}%`} axisLine={{ stroke: "#3a2f5f", strokeDasharray: "1 6" }} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#6b6b8a" width={88} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value) => [`${Number(value ?? 0)}% of players`, "Share"]}
                contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                labelStyle={{ color: "#f0f0f0" }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {sim.outcomeBands.map((entry, idx) => (
                  <Cell key={entry.name} fill={bandColors[idx] ?? "#7c3aed"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#ff2040]">{currencyCompact(sim.worstLoss)}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">worst loss</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#00d4ff]">{currencyCompact(sim.bestOutcome)}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">best outcome</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#00d4ff]">{sim.secondPrizeWins.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">2nd prize wins</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#ffd700]">{sim.jackpotWins.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">jackpots</div>
          </div>
        </div>

        <div className="text-center text-xs text-[#6b6b8a]">
          Total won across all players: {currencyCompact(sim.totalWon)} · Total prize hits: {sim.totalPrizeWins.toLocaleString()}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [weeklySpend, setWeeklySpend] = useState(20);
  const [yearsPlayed, setYearsPlayed] = useState(10);
  const [trials, setTrials] = useState(5000);
  const [selectedGame, setSelectedGame] = useState<LotteryGame>(POWERBALL);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calcResult = useMemo(() => calculateLotto({ weeklySpend, yearsPlayed }), [weeklySpend, yearsPlayed]);
  const expected = useMemo(
    () => calculateExpected({ weeklySpend, yearsPlayed, game: selectedGame }),
    [weeklySpend, yearsPlayed, selectedGame],
  );

  const runSim = useCallback(() => {
    setSimLoading(true);
    setSimResult(null);
    setTimeout(() => {
      const sim = runSimulation({
        weeklySpend,
        yearsPlayed,
        trials,
        game: selectedGame,
      });
      setSimResult(sim);
      setSimLoading(false);
    }, 50);
  }, [weeklySpend, yearsPlayed, trials, selectedGame]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-[#6b6b8a] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  const totalSpent = weeklySpend * 52 * yearsPlayed;

  return (
    <SiteShell active="lotto">
      <div className="max-w-2xl mx-auto">
        <section className="pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#6b6b8a] bg-[#1e1535] border border-[#2e2560] rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffd700] animate-pulse" />
            {selectedGame.name} · {currencyCompact(selectedGame.jackpot)} jackpot · Odds: 1 in {selectedGame.odds.jackpot.toLocaleString()}
          </div>

          <h1 className="text-[2rem] md:text-[3.15rem] font-black leading-[1.1] mb-7 tracking-tight min-h-[3.45em] mx-auto text-center">
            <span className="block whitespace-nowrap">You're more likely to</span>
            <span className="block min-h-[1.2em] my-1">
              <span className="inline-flex min-w-[12.75ch] justify-start align-baseline text-left">
                <AnimatedTextCycle
                  words={[
                    "die in a plane crash",
                    "be struck by lightning",
                    "be attacked by a shark",
                    "be bitten by a venomous spider",
                    "die from a vending machine tipping",
                    "get hit by an asteroid",
                  ]}
                  interval={3600}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2040] to-[#ff6090]"
                />
              </span>
            </span>
            <span className="block whitespace-nowrap">than hit the jackpot.</span>
          </h1>

          <p className="text-[#6b6b8a] text-lg max-w-lg mx-auto leading-relaxed">
            {selectedGame.name} advertises a <span className="text-white font-mono font-bold">{expected.advertisedReturnPct}% return</span> — but your actual cash return is only <span className="text-[#ff2040] font-mono font-bold">{(expected.cashReturnRate * 100).toFixed(1)}%</span>.
          </p>
        </section>

        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="flex gap-3">
            {[POWERBALL, MEGA_MILLIONS].map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  setSelectedGame(game);
                  setSimResult(null);
                }}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                  selectedGame.id === game.id
                    ? "border-[#ffd700] bg-[#ffd700]/10 text-[#ffd700]"
                    : "border-[#1e1535] bg-[#0f0a1e]/60 text-[#6b6b8a] hover:border-[#2e2560]"
                }`}
              >
                <div>{game.name}</div>
                <div className="text-xs font-mono mt-0.5 opacity-70">{currencyCompact(game.jackpot)}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[#6b6b8a] mt-2 px-1">
            <span>Last: {selectedGame.lastDraw}</span>
            <span>Next: {selectedGame.nextDraw}</span>
          </div>
        </section>

        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <div className="space-y-7">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Weekly lottery spend</label>
                  <span className="font-mono text-2xl font-black text-[#ff2040]">${weeklySpend.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={10}
                  value={weeklySpend}
                  onChange={(e) => setWeeklySpend(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(weeklySpend, 0, 5000, "#00d4ff")}
                />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>$0</span>
                  <span>${(weeklySpend * 52).toLocaleString()}/yr</span>
                  <span>$5,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Years playing</label>
                  <span className="font-mono text-2xl font-black text-[#00d4ff]">{yearsPlayed}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={70}
                  step={1}
                  value={yearsPlayed}
                  onChange={(e) => setYearsPlayed(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(yearsPlayed, 1, 70, "#00d4ff")}
                />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>1yr</span>
                  <span>{yearsPlayed} years</span>
                  <span>70yr</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Monte Carlo players</label>
                  <span className="font-mono text-2xl font-black text-[#7c3aed]">{trials.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={6000}
                  step={100}
                  value={trials}
                  onChange={(e) => setTrials(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(trials, 100, 6000, "#00d4ff")}
                />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>100</span>
                  <span>{trials.toLocaleString()} players</span>
                  <span>6,000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-4 font-mono">
              Statistically expected — {yearsPlayed} years of play
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#030014] rounded-xl p-4 border border-[#1e1535]">
                <div className="text-xs text-[#6b6b8a] uppercase mb-1">Total spent</div>
                <div className="font-mono text-xl font-black text-white">${totalSpent.toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a] mt-0.5">{(totalSpent / 2).toLocaleString()} tickets</div>
              </div>
              <div className="bg-[#030014] rounded-xl p-4 border border-[#ff2040]/30">
                <div className="text-xs text-[#6b6b8a] uppercase mb-1">Expected return</div>
                <div className="font-mono text-xl font-black text-[#ff2040]">${expected.expectedWon.toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a] mt-0.5">
                  {(expected.cashReturnRate * 100).toFixed(1)}% cash return <span className="text-[#6b6b8a]/50">(lottery claims {expected.advertisedReturnPct}%)</span>
                </div>
              </div>
              <div className="bg-[#030014] rounded-xl p-4 border border-[#ff2040]/40 col-span-2">
                <div className="text-xs text-[#6b6b8a] uppercase mb-1">Expected net loss</div>
                <div className="font-mono text-3xl font-black text-[#ff2040]">${Math.abs(expected.netExpected).toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a] mt-1 leading-relaxed">
                  Across all players spending ${weeklySpend.toLocaleString()}/week for {yearsPlayed} years, statistically expected.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1e1535]">
              <div className="text-xs text-[#6b6b8a] uppercase mb-3 tracking-wider">Most likely prizes you'll hit</div>
              <div className="space-y-2">
                {expected.tierResults
                  .filter((t) => t.expectedHits >= 0.0001)
                  .sort((a, b) => b.odds - a.odds)
                  .slice(0, 6)
                  .map((tier) => {
                    const isJackpot = tier.match === "JACKPOT";
                    return (
                      <div
                        key={tier.match}
                        className="flex items-center justify-between bg-[#030014] rounded-lg px-4 py-3 border border-[#1e1535]"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-black text-xl ${isJackpot ? "text-[#ffd700]" : "text-[#f0f0f0]"}`}>
                            {tier.prize >= 1_000_000 ? `$${(tier.prize / 1_000_000).toFixed(1)}M` : `$${tier.prize.toLocaleString()}`}
                          </span>
                          <span className="text-sm text-[#6b6b8a]">{tier.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-[#00d4ff]">
                            {tier.expectedHits < 0.01 ? "~0" : tier.expectedHits < 1 ? `${(tier.expectedHits * 1000).toFixed(0)} / 1K` : `${tier.expectedHits.toFixed(1)}`} hits
                          </div>
                          <div className="text-xs text-[#6b6b8a]">1 in {tier.odds.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center w-full">
              <Button
                onClick={runSim}
                disabled={simLoading}
                className="flex-1 font-mono text-base bg-[#7c3aed] hover:bg-[#6d28d9] border border-[#7c3aed]/40 h-12"
              >
              {simLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Simulating {trials.toLocaleString()} players...
                </span>
              ) : (
                `Run Monte Carlo Simulation (${trials.toLocaleString()} players)`
              )}
              </Button>
              <MonteCarloInfo />
            </div>
            <p className="text-xs text-[#6b6b8a]">
              {trials.toLocaleString()} players · ${weeklySpend.toLocaleString()}/wk · {yearsPlayed} years · see the range of real outcomes
            </p>
          </div>
        </section>

        {simResult && <MonteCarloResults sim={simResult} />}

        <section className="max-w-xl mx-auto px-6 mb-16">
          <h2 className="text-xl font-black mb-4">What could you do with ${Math.abs(expected.netExpected).toLocaleString()}?</h2>
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl mb-1">🍔</div>
                <div className="font-mono text-sm font-bold text-[#00ff87]">{Math.floor(Math.abs(expected.netExpected) / 15).toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a]">restaurant meals</div>
              </div>
              <div>
                <div className="text-2xl mb-1">⛽</div>
                <div className="font-mono text-sm font-bold text-[#00d4ff]">{Math.floor(Math.abs(expected.netExpected) / 50).toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a]">gas fill-ups</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🏠</div>
                <div className="font-mono text-sm font-bold text-[#ffd700]">
                  {yearsPlayed > 5 ? `${(Math.abs(expected.netExpected) / 1500).toFixed(1)}` : `${Math.floor(Math.abs(expected.netExpected) / 200)}`}
                </div>
                <div className="text-xs text-[#6b6b8a]">{yearsPlayed > 5 ? "months rent" : "months groceries"}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-xl mx-auto px-6 mb-8 text-center">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#00ff87]/20">
            <h2 className="text-2xl font-black text-[#00ff87] mb-4">The only win is knowing the odds.</h2>
            <p className="text-[#6b6b8a] leading-relaxed">
              Every dollar you don&apos;t spend on a lottery ticket is a dollar toward something real. The house always wins. The only way to beat them is not to play.
            </p>
            <p className="text-[#6b6b8a] text-xs mt-4">
              Live jackpot values were refreshed from the official Powerball and Mega Millions sites during this rebuild.
            </p>
          </div>
        </section>

        {/* Donate */}
        <section className="max-w-xl mx-auto px-6 pb-24 text-center">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#ffd700]/20">
            <p className="text-[#6b6b8a] text-sm mb-4">
              We built this tool for free to help people see the real math behind gambling. If it saved you money or opened your eyes, consider supporting us.
            </p>
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ffd700] text-[#030014] font-bold text-sm hover:bg-[#ffed4a] transition-colors"
            >
              ☕ Buy us a coffee
            </a>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
