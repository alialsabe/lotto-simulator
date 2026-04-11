"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateBlackjackExpected,
  runBlackjackSimulation,
  getSkillLabel,
  type BlackjackParams,
  type BlackjackSkill,
  type BlackjackSimResult,
} from "@/lib/blackjack";
import { SiteShell } from "@/components/site-shell";

function MonteCarloInfo() {
  return (
    <span className="relative group inline-flex items-center ml-2 cursor-help">
      <span className="w-5 h-5 rounded-full border border-[#6b6b8a]/50 text-[#6b6b8a] text-xs font-bold flex items-center justify-center hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors">
        i
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-[#0f0a1e] border border-[#1e1535] text-xs text-[#b0b0c8] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
        A Monte Carlo simulation runs thousands of random trials to model the probability of different outcomes when randomness is involved. Instead of relying on a single expected-value number, it plays out full scenarios — here, thousands of players gambling over years — to show the real range of results, from lucky streaks to devastating losses.
        {" "}
        <a
          href="https://en.wikipedia.org/wiki/Monte_Carlo_method"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00d4ff] underline pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          Learn more on Wikipedia →
        </a>
      </span>
    </span>
  );
}

function sliderFill(value: number, min: number, max: number, color: string) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return {
    backgroundImage: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #241a40 ${pct}%, #241a40 100%)`,
    backgroundColor: "transparent",
  };
}

function currencyCompact(value: number) {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${prefix}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}$${Math.round(abs / 1_000)}K`;
  return `${prefix}$${Math.round(abs).toLocaleString()}`;
}

function formatSignedCurrency(value: number) {
  return value < 0 ? `-$${Math.abs(value).toLocaleString()}` : `+$${value.toLocaleString()}`;
}

const BAND_COLORS = ["#dc2626", "#f97316", "#eab308", "#6b7280", "#22c55e", "#06b6d4"];

function MonteCarloResults({ sim, trials }: { sim: BlackjackSimResult; trials: number }) {
  return (
    <section className="max-w-xl mx-auto px-6 mb-12">
      <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#00d4ff]/40">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#00d4ff]">
              {trials.toLocaleString()} Players Simulated
            </h2>
            <p className="text-[#6b6b8a] text-sm mt-1">
              Blackjack · {getSkillLabel(sim.params.skill)} · ${sim.params.betPerHand}/hand · {sim.params.handsPerHour} hands/hr
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-black text-[#ff2040]">
              {currencyCompact(sim.avgLossPerPlayer)}
            </div>
            <div className="text-xs text-[#6b6b8a]">avg net per player</div>
          </div>
        </div>

        {/* Bankroll curve */}
        <div className="mb-6 h-56 w-full rounded-xl border border-[#1e1535] bg-[#030014] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sim.bankrollCurve} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
              <defs>
                <linearGradient id="bj-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sim.bankrollCurve[sim.bankrollCurve.length - 1]?.bankroll >= 0 ? "#00d4ff" : "#ff2040"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#030014" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" />
              <XAxis dataKey="hand" stroke="#6b6b8a" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tickLine={false} axisLine={{ stroke: "#3a2f5f" }} />
              <YAxis stroke="#6b6b8a" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tickLine={false} axisLine={{ stroke: "#3a2f5f" }} />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, "Bankroll"]}
                labelFormatter={(v) => `Hand ${Number(v).toLocaleString()}`}
                contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                labelStyle={{ color: "#f0f0f0" }}
              />
              <Area type="monotone" dataKey="bankroll" stroke="#00d4ff" fill="url(#bj-grad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Outcome bands */}
        <div className="mb-6 h-56 w-full rounded-xl border border-[#1e1535] bg-[#030014] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sim.outcomeBands} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
              <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" horizontal={false} vertical />
              <XAxis type="number" stroke="#6b6b8a" tickFormatter={(v) => `${v}%`} axisLine={{ stroke: "#3a2f5f", strokeDasharray: "1 6" }} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#6b6b8a" width={100} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value) => [`${Number(value ?? 0)}% of players`, "Share"]}
                contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                labelStyle={{ color: "#f0f0f0" }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {sim.outcomeBands.map((entry, idx) => (
                  <Cell key={entry.name} fill={BAND_COLORS[idx] ?? "#00d4ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hand stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#00d4ff]">{sim.wins.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">wins/player</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#ff2040]">{sim.losses.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">losses/player</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#6b7280]">{sim.pushes.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">pushes/player</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#ffd700]">{sim.blackjacks.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">blackjacks/player</div>
          </div>
        </div>

        {/* Best / Worst */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#030014] rounded-xl p-3 border border-[#00ff87]/30 text-center">
            <div className="font-mono font-black text-[#00ff87]">{formatSignedCurrency(sim.bestPlayerProfit)}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">best player profit</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#ff2040]/30 text-center">
            <div className="font-mono font-black text-[#ff2040]">{formatSignedCurrency(sim.worstPlayerLoss)}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">worst player loss</div>
          </div>
        </div>

        <div className="text-center text-xs text-[#6b6b8a]">
          {sim.trials.toLocaleString()} players · avg loss ${sim.avgLossPerPlayer.toLocaleString()} · {(sim.houseEdge * 100).toFixed(1)}% edge
        </div>
      </div>
    </section>
  );
}

export default function BlackjackPage() {
  const [mounted, setMounted] = useState(false);
  const [betPerHand, setBetPerHand] = useState(25);
  const [handsPerHour, setHandsPerHour] = useState(70);
  const [hoursPerWeek, setHoursPerWeek] = useState(4);
  const [yearsPlayed, setYearsPlayed] = useState(5);
  const [skill, setSkill] = useState<BlackjackSkill>("perfect");
  const [trials, setTrials] = useState(5000);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<BlackjackSimResult | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const params: BlackjackParams = useMemo(
    () => ({ betPerHand, handsPerHour, hoursPerWeek, yearsPlayed, skill }),
    [betPerHand, handsPerHour, hoursPerWeek, yearsPlayed, skill]
  );

  const expected = useMemo(() => calculateBlackjackExpected(params), [params]);

  const runSim = useCallback(() => {
    setSimLoading(true);
    setSimResult(null);
    setTimeout(() => {
      const sim = runBlackjackSimulation(params, trials);
      setSimResult(sim);
      setSimLoading(false);
    }, 50);
  }, [params, trials]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-[#6b6b8a] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <SiteShell active="blackjack">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <section className="pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#6b6b8a] bg-[#1e1535] border border-[#2e2560] rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            Blackjack · {(expected.edge * 100).toFixed(1)}% house edge · {expected.totalHands.toLocaleString()} hands
          </div>

          <h1 className="text-[2rem] md:text-[3.15rem] font-black leading-[1.1] mb-7 tracking-tight mx-auto text-center">
            <span className="block">Blackjack feels beatable.</span>
            <span className="block text-[#ff2040]">The math still bleeds you.</span>
          </h1>

          <p className="text-[#6b6b8a] text-lg max-w-lg mx-auto leading-relaxed">
            With {getSkillLabel(skill)}, you&apos;ll lose <span className="text-[#ff2040] font-mono font-bold">${expected.expectedLoss.toLocaleString()}</span> over {yearsPlayed} years. That&apos;s a{" "}
            <span className="text-white font-mono font-bold">{expected.expectedReturnPct}%</span> return on ${expected.totalWagered.toLocaleString()} wagered.
          </p>
        </section>

        {/* Skill selector */}
        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="flex gap-3">
            {([
              ["perfect", "Perfect Strategy", "0.5%"],
              ["average", "Average", "2%"],
              ["beginner", "Beginner", "4%"],
            ] as [BlackjackSkill, string, string][]).map(([s, label, edge]) => (
              <button
                key={s}
                onClick={() => { setSkill(s); setSimResult(null); }}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm font-bold transition-all ${
                  skill === s
                    ? "border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff]"
                    : "border-[#1e1535] bg-[#0f0a1e]/60 text-[#6b6b8a] hover:border-[#2e2560]"
                }`}
              >
                <div>{label}</div>
                <div className="text-xs font-mono mt-0.5 opacity-70">{edge} edge</div>
              </button>
            ))}
          </div>
        </section>

        {/* Sliders */}
        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <div className="space-y-7">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Bet per hand</label>
                  <span className="font-mono text-2xl font-black text-[#00d4ff]">${betPerHand}</span>
                </div>
                <input type="range" min={5} max={500} step={5} value={betPerHand}
                  onChange={(e) => setBetPerHand(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(betPerHand, 5, 500, "#00d4ff")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>$5</span><span>${(betPerHand * handsPerHour * hoursPerWeek).toLocaleString()}/wk</span><span>$500</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Hands per hour</label>
                  <span className="font-mono text-2xl font-black text-[#00d4ff]">{handsPerHour}</span>
                </div>
                <input type="range" min={30} max={200} step={5} value={handsPerHour}
                  onChange={(e) => setHandsPerHour(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(handsPerHour, 30, 200, "#00d4ff")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>30</span><span>{handsPerHour * hoursPerWeek * 52 * yearsPlayed} total hands</span><span>200</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Hours per week</label>
                  <span className="font-mono text-2xl font-black text-[#00d4ff]">{hoursPerWeek}</span>
                </div>
                <input type="range" min={1} max={40} step={1} value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(hoursPerWeek, 1, 40, "#00d4ff")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>1hr</span><span>{(hoursPerWeek * 52).toLocaleString()} hrs/year</span><span>40hrs</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Years playing</label>
                  <span className="font-mono text-2xl font-black text-[#00d4ff]">{yearsPlayed}</span>
                </div>
                <input type="range" min={1} max={50} step={1} value={yearsPlayed}
                  onChange={(e) => setYearsPlayed(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(yearsPlayed, 1, 50, "#00d4ff")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>1yr</span><span>{yearsPlayed} years</span><span>50yr</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Monte Carlo players</label>
                  <span className="font-mono text-2xl font-black text-[#7c3aed]">{trials.toLocaleString()}</span>
                </div>
                <input type="range" min={100} max={6000} step={100} value={trials}
                  onChange={(e) => setTrials(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(trials, 100, 6000, "#00d4ff")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>100</span><span>{trials.toLocaleString()} players</span><span>6,000</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Expected results */}
        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-4 font-mono">
              Statistically expected — {yearsPlayed} years of play
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#030014] rounded-xl p-4 border border-[#1e1535]">
                <div className="text-xs text-[#6b6b8a] uppercase mb-1">Total wagered</div>
                <div className="font-mono text-xl font-black text-white">${expected.totalWagered.toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a] mt-0.5">{expected.totalHands.toLocaleString()} hands</div>
              </div>
              <div className="bg-[#030014] rounded-xl p-4 border border-[#1e1535]">
                <div className="text-xs text-[#6b6b8a] uppercase mb-1">Return rate</div>
                <div className="font-mono text-xl font-black text-[#00d4ff]">{expected.expectedReturnPct}%</div>
                <div className="text-xs text-[#6b6b8a] mt-0.5">{(expected.edge * 100).toFixed(1)}% house edge</div>
              </div>
              <div className="bg-[#030014] rounded-xl p-4 border border-[#ff2040]/40 col-span-2">
                <div className="text-xs text-[#6b6b8a] uppercase mb-1">Expected net loss</div>
                <div className="font-mono text-3xl font-black text-[#ff2040]">${expected.expectedLoss.toLocaleString()}</div>
                <div className="text-xs text-[#6b6b8a] mt-1 leading-relaxed">
                  ${betPerHand}/hand × {handsPerHour} hands/hr × {hoursPerWeek}hrs/wk × {yearsPlayed} years at {(expected.edge * 100).toFixed(1)}% edge.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1e1535]">
              <div className="text-xs text-[#6b6b8a] uppercase mb-3 tracking-wider">What that loss could buy</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl mb-1">🍔</div>
                  <div className="font-mono text-sm font-bold text-[#00ff87]">{Math.floor(expected.expectedLoss / 15).toLocaleString()}</div>
                  <div className="text-xs text-[#6b6b8a]">restaurant meals</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">⛽</div>
                  <div className="font-mono text-sm font-bold text-[#00d4ff]">{Math.floor(expected.expectedLoss / 50).toLocaleString()}</div>
                  <div className="text-xs text-[#6b6b8a]">gas fill-ups</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">🏠</div>
                  <div className="font-mono text-sm font-bold text-[#ffd700]">{(expected.expectedLoss / 1500).toFixed(1)}</div>
                  <div className="text-xs text-[#6b6b8a]">months rent</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Run button */}
        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center w-full">
              <button
                onClick={runSim}
                disabled={simLoading}
                className="flex-1 font-mono text-base bg-[#00d4ff] hover:bg-[#00b8e6] text-[#030014] border border-[#00d4ff]/40 h-12 rounded-xl font-bold transition-all"
              >
              {simLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-[#030014]/30 border-t-[#030014] rounded-full animate-spin" />
                  Simulating {trials.toLocaleString()} players...
                </span>
              ) : (
                `Run Monte Carlo Simulation (${trials.toLocaleString()} players)`
              )}
              </button>
              <MonteCarloInfo />
            </div>
            <p className="text-xs text-[#6b6b8a]">
              {trials.toLocaleString()} players · ${betPerHand}/hand · {handsPerHour} hands/hr · {hoursPerWeek}hrs/wk · {yearsPlayed} years
            </p>
          </div>
        </section>

        {simResult && <MonteCarloResults sim={simResult} trials={trials} />}

        {/* Closer */}
        <section className="max-w-xl mx-auto px-6 mb-8 text-center">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#00d4ff]/20">
            <h2 className="text-2xl font-black text-[#00d4ff] mb-4">The house doesn&apos;t need luck.</h2>
            <p className="text-[#6b6b8a] leading-relaxed">
              Even with perfect basic strategy, the casino takes half a cent of every dollar you wager. Over thousands of hands, that&apos;s a guarantee — not a risk.
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
