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
  calculateRouletteExpected,
  runRouletteSimulation,
  getWheelLabel,
  getBetLabel,
  type RouletteParams,
  type RouletteWheel,
  type RouletteBetType,
  type RouletteSimResult,
} from "@/lib/roulette";
import { SiteShell } from "@/components/site-shell";

function MonteCarloInfo() {
  return (
    <span className="relative group inline-flex items-center ml-2 cursor-help">
      <span className="w-5 h-5 rounded-full border border-[#6b6b8a]/50 text-[#6b6b8a] text-xs font-bold flex items-center justify-center hover:border-[#ff2040] hover:text-[#ff2040] transition-colors">
        i
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-[#0f0a1e] border border-[#1e1535] text-xs text-[#b0b0c8] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
        A Monte Carlo simulation runs thousands of random trials to model the probability of different outcomes when randomness is involved. Instead of relying on a single expected-value number, it plays out full scenarios — here, thousands of players gambling over years — to show the real range of results, from lucky streaks to devastating losses.
        {" "}
        <a
          href="https://en.wikipedia.org/wiki/Monte_Carlo_method"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ff2040] underline pointer-events-auto"
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

const BAND_COLORS = ["#dc2626", "#f97316", "#eab308", "#6b7280", "#22c55e", "#06b6d4"];

function MonteCarloResults({ sim, trials }: { sim: RouletteSimResult; trials: number }) {
  return (
    <section className="max-w-xl mx-auto px-6 mb-12">
      <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#ff2040]/40">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#ff2040]">
              {trials.toLocaleString()} Players Simulated
            </h2>
            <p className="text-[#6b6b8a] text-sm mt-1">
              {getWheelLabel(sim.params.wheel)} · {getBetLabel(sim.params.betType)} · ${sim.params.betPerSpin}/spin
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-black text-[#ff2040]">
              ${sim.avgLossPerPlayer.toLocaleString()}
            </div>
            <div className="text-xs text-[#6b6b8a]">avg loss per player</div>
          </div>
        </div>

        {/* Bankroll curve */}
        <div className="mb-6 h-56 w-full rounded-xl border border-[#1e1535] bg-[#030014] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sim.bankrollCurve} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
              <defs>
                <linearGradient id="rl-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sim.bankrollCurve[sim.bankrollCurve.length - 1]?.bankroll >= 0 ? "#00d4ff" : "#ff2040"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#030014" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" />
              <XAxis dataKey="spin" stroke="#6b6b8a" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tickLine={false} axisLine={{ stroke: "#3a2f5f" }} />
              <YAxis stroke="#6b6b8a" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tickLine={false} axisLine={{ stroke: "#3a2f5f" }} />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, "Bankroll"]}
                labelFormatter={(v) => `Spin ${Number(v).toLocaleString()}`}
                contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                labelStyle={{ color: "#f0f0f0" }}
              />
              <Area type="monotone" dataKey="bankroll" stroke="#ff2040" fill="url(#rl-grad)" strokeWidth={2} dot={false} />
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
                  <Cell key={entry.name} fill={BAND_COLORS[idx] ?? "#ff2040"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spin stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#ff2040]">{sim.redWins.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">red hits/player</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#f0f0f0]">{sim.blackWins.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">black hits/player</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#00ff87]">{sim.greenHits.toLocaleString()}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">green (0/00)</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#f97316]">{sim.longestLoseStreak}</div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">longest lose streak</div>
          </div>
        </div>

        <div className="text-center text-xs text-[#6b6b8a]">
          Worst session: ${sim.worstLoss.toLocaleString()} · Best session: ${sim.bestOutcome.toLocaleString()} · Longest win streak: {sim.longestWinStreak}
        </div>
      </div>
    </section>
  );
}

export default function RoulettePage() {
  const [mounted, setMounted] = useState(false);
  const [betPerSpin, setBetPerSpin] = useState(25);
  const [spinsPerHour, setSpinsPerHour] = useState(35);
  const [hoursPerWeek, setHoursPerWeek] = useState(4);
  const [yearsPlayed, setYearsPlayed] = useState(5);
  const [wheel, setWheel] = useState<RouletteWheel>("american");
  const [betType, setBetType] = useState<RouletteBetType>("even_money");
  const [trials, setTrials] = useState(5000);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<RouletteSimResult | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const params: RouletteParams = useMemo(
    () => ({ betPerSpin, spinsPerHour, hoursPerWeek, yearsPlayed, wheel, betType }),
    [betPerSpin, spinsPerHour, hoursPerWeek, yearsPlayed, wheel, betType]
  );

  const expected = useMemo(() => calculateRouletteExpected(params), [params]);

  const runSim = useCallback(() => {
    setSimLoading(true);
    setSimResult(null);
    setTimeout(() => {
      const sim = runRouletteSimulation(params, trials);
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
    <SiteShell active="roulette">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <section className="pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#6b6b8a] bg-[#1e1535] border border-[#2e2560] rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2040] animate-pulse" />
            {getWheelLabel(wheel)} · {(expected.edge * 100).toFixed(1)}% house edge · {expected.totalSpins.toLocaleString()} spins
          </div>

          <h1 className="text-[2rem] md:text-[3.15rem] font-black leading-[1.1] mb-7 tracking-tight mx-auto text-center">
            <span className="block">Roulette feels random.</span>
            <span className="block text-[#ff2040]">The edge is fixed against you.</span>
          </h1>

          <p className="text-[#6b6b8a] text-lg max-w-lg mx-auto leading-relaxed">
            {getBetLabel(betType)} on a {getWheelLabel(wheel)} wheel — you&apos;ll lose{" "}
            <span className="text-[#ff2040] font-mono font-bold">${expected.expectedLoss.toLocaleString()}</span> over {yearsPlayed} years.
            That&apos;s a <span className="text-white font-mono font-bold">{expected.expectedReturnPct}%</span> return.
          </p>
        </section>

        {/* Wheel selector */}
        <section className="max-w-xl mx-auto px-6 mb-4">
          <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-2 font-mono">Wheel type</div>
          <div className="flex gap-3">
            {(["american", "european"] as RouletteWheel[]).map((w) => (
              <button
                key={w}
                onClick={() => { setWheel(w); setSimResult(null); }}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm font-bold transition-all ${
                  wheel === w
                    ? "border-[#ff2040] bg-[#ff2040]/10 text-[#ff2040]"
                    : "border-[#1e1535] bg-[#0f0a1e]/60 text-[#6b6b8a] hover:border-[#2e2560]"
                }`}
              >
                <div className="capitalize">{w}</div>
                <div className="text-xs font-mono mt-0.5 opacity-70">
                  {w === "american" ? "5.26%" : "2.7%"} edge
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Bet type selector */}
        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-2 font-mono">Bet type</div>
          <div className="flex gap-3">
            {(["even_money", "dozen", "straight"] as RouletteBetType[]).map((b) => (
              <button
                key={b}
                onClick={() => { setBetType(b); setSimResult(null); }}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm font-bold transition-all ${
                  betType === b
                    ? "border-[#ffd700] bg-[#ffd700]/10 text-[#ffd700]"
                    : "border-[#1e1535] bg-[#0f0a1e]/60 text-[#6b6b8a] hover:border-[#2e2560]"
                }`}
              >
                <div>{b === "even_money" ? "Red/Black" : b === "dozen" ? "Dozen" : "Straight"}</div>
                <div className="text-xs font-mono mt-0.5 opacity-70">
                  {b === "even_money" ? "1:1" : b === "dozen" ? "2:1" : "35:1"}
                </div>
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
                  <label className="text-sm text-[#6b6b8a]">Bet per spin</label>
                  <span className="font-mono text-2xl font-black text-[#ff2040]">${betPerSpin}</span>
                </div>
                <input type="range" min={5} max={500} step={5} value={betPerSpin}
                  onChange={(e) => setBetPerSpin(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(betPerSpin, 5, 500, "#ff2040")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>$5</span><span>${(betPerSpin * spinsPerHour * hoursPerWeek).toLocaleString()}/wk</span><span>$500</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Spins per hour</label>
                  <span className="font-mono text-2xl font-black text-[#ff2040]">{spinsPerHour}</span>
                </div>
                <input type="range" min={10} max={80} step={5} value={spinsPerHour}
                  onChange={(e) => setSpinsPerHour(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(spinsPerHour, 10, 80, "#ff2040")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>10</span><span>{spinsPerHour * hoursPerWeek * 52 * yearsPlayed} total spins</span><span>80</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Hours per week</label>
                  <span className="font-mono text-2xl font-black text-[#ff2040]">{hoursPerWeek}</span>
                </div>
                <input type="range" min={1} max={40} step={1} value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(hoursPerWeek, 1, 40, "#ff2040")} />
                <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                  <span>1hr</span><span>{(hoursPerWeek * 52).toLocaleString()} hrs/year</span><span>40hrs</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-[#6b6b8a]">Years playing</label>
                  <span className="font-mono text-2xl font-black text-[#ff2040]">{yearsPlayed}</span>
                </div>
                <input type="range" min={1} max={50} step={1} value={yearsPlayed}
                  onChange={(e) => setYearsPlayed(Number(e.target.value))}
                  className="w-full appearance-none h-2 rounded-full"
                  style={sliderFill(yearsPlayed, 1, 50, "#ff2040")} />
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
                  style={sliderFill(trials, 100, 6000, "#ff2040")} />
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
                <div className="text-xs text-[#6b6b8a] mt-0.5">{expected.totalSpins.toLocaleString()} spins</div>
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
                  ${betPerSpin}/spin × {spinsPerHour} spins/hr × {hoursPerWeek}hrs/wk × {yearsPlayed} years at {(expected.edge * 100).toFixed(1)}% edge.
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
                className="flex-1 font-mono text-base bg-[#ff2040] hover:bg-[#e01030] text-white border border-[#ff2040]/40 h-12 rounded-xl font-bold transition-all"
              >
                {simLoading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Simulating {trials.toLocaleString()} players...
                  </span>
                ) : (
                  `Run Monte Carlo Simulation (${trials.toLocaleString()} players)`
                )}
              </button>
              <MonteCarloInfo />
            </div>
            <p className="text-xs text-[#6b6b8a]">
              {trials.toLocaleString()} players · ${betPerSpin}/spin · {spinsPerHour} spins/hr · {hoursPerWeek}hrs/wk · {yearsPlayed} years
            </p>
          </div>
        </section>

        {simResult && <MonteCarloResults sim={simResult} trials={trials} />}

        {/* Closer */}
        <section className="max-w-xl mx-auto px-6 mb-8 text-center">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#ff2040]/20">
            <h2 className="text-2xl font-black text-[#ff2040] mb-4">The wheel doesn&apos;t care about your system.</h2>
            <p className="text-[#6b6b8a] leading-relaxed">
              Martingale, Fibonacci, hot numbers — none of them change the fact that the casino keeps 2.7¢ to 5.3¢ of every dollar on every spin. Forever.
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
