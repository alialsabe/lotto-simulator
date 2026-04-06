"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SiteShell } from "@/components/site-shell";

// ─── Types ───────────────────────────────────────────────────────
interface ScratcherGame {
  name: string;
  gameNumber: string;
  score: number;
  price: number;
}

interface ScratchersData {
  scrapedAt: string;
  states: Record<string, { name: string; gameCount: number; games: ScratcherGame[] }>;
}

interface ScratchSimResult {
  ticketsPerWeek: number;
  totalTickets: number;
  totalSpent: number;
  totalWon: number;
  netResult: number;
  avgWinPerTicket: number;
  winRate: number;
  topPrizeHits: number;
  outcomeBands: { name: string; value: number; count: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────
function sliderFill(value: number, min: number, max: number, color: string) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return {
    backgroundImage: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #241a40 ${pct}%, #241a40 100%)`,
    backgroundColor: "transparent",
  };
}

const BAND_COLORS = ["#dc2626", "#f97316", "#eab308", "#6b7280", "#22c55e", "#06b6d4"];

function MonteCarloInfo() {
  return (
    <span className="relative group inline-flex items-center ml-2 cursor-help">
      <span className="w-5 h-5 rounded-full border border-[#6b6b8a]/50 text-[#6b6b8a] text-xs font-bold flex items-center justify-center hover:border-[#00ff87] hover:text-[#00ff87] transition-colors">
        i
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-[#0f0a1e] border border-[#1e1535] text-xs text-[#b0b0c8] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
        A Monte Carlo simulation runs thousands of random trials to model the probability of different outcomes when randomness is involved. Instead of relying on a single expected-value number, it plays out full scenarios — here, thousands of players scratching tickets over years — to show the real range of results.
        {" "}
        <a
          href="https://en.wikipedia.org/wiki/Monte_Carlo_method"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00ff87] underline pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          Learn more on Wikipedia →
        </a>
      </span>
    </span>
  );
}

// ─── Simulation ──────────────────────────────────────────────────
function runScratcherSim(
  game: ScratcherGame,
  ticketsPerWeek: number,
  years: number,
  trials: number,
): ScratchSimResult {
  const totalTickets = ticketsPerWeek * 52 * years;
  const totalSpent = totalTickets * game.price;

  // Score = estimated return %. A score of 78 means you get back ~78 cents per dollar.
  // Real scratchers: ~30% of tickets are "winners" (return ≥ ticket price).
  // But many "winners" just break even. We model this with tiers.
  //
  // Payout tiers (per winning ticket):
  //   70% of wins → break even (1x price)
  //   20% of wins → 3x price
  //   8% of wins  → 10x price
  //   1.9% of wins → 50x price
  //   0.1% of wins → 500x price
  //
  // Expected payout per win = 0.7*1 + 0.2*3 + 0.08*10 + 0.019*50 + 0.001*500
  //                        = 0.7 + 0.6 + 0.8 + 0.95 + 0.5 = 3.55x
  //
  // To hit a return rate of R = score/100:
  //   winChance × 3.55 = R  →  winChance = R / 3.55
  //   e.g. score 78 → winChance = 0.78/3.55 = 22%
  //   e.g. score 50 → winChance = 0.50/3.55 = 14%
  //   e.g. score 131 → winChance = 1.31/3.55 = 37% (but capped)

  const returnRate = game.score / 100;
  const avgPayoutMultiplier = 3.55; // from the tier distribution above
  const winChance = Math.min(returnRate / avgPayoutMultiplier, 0.45); // cap at 45%

  const finalNets: number[] = [];
  const bands = [
    { name: "Lost it all", test: (v: number) => v <= -totalSpent * 0.7, count: 0 },
    { name: "Heavy loss", test: (v: number) => v > -totalSpent * 0.7 && v <= -totalSpent * 0.3, count: 0 },
    { name: "Moderate loss", test: (v: number) => v > -totalSpent * 0.3 && v < -game.price * 5, count: 0 },
    { name: "Break even ±", test: (v: number) => Math.abs(v) < game.price * 5, count: 0 },
    { name: "Small profit", test: (v: number) => v >= game.price * 5 && v < totalSpent * 0.2, count: 0 },
    { name: "Big winner", test: (v: number) => v >= totalSpent * 0.2, count: 0 },
  ];

  let totalWonAll = 0;
  let topPrizeHits = 0;

  function sampleWinPayout(): { payout: number; isTop: boolean } {
    const r = Math.random();
    if (r < 0.001) return { payout: game.price * 500, isTop: true };  // 0.1% → 500x
    if (r < 0.02)  return { payout: game.price * 50, isTop: false };   // 1.9% → 50x
    if (r < 0.10)  return { payout: game.price * 10, isTop: false };   // 8%   → 10x
    if (r < 0.30)  return { payout: game.price * 3, isTop: false };    // 20%  → 3x
    return { payout: game.price, isTop: false };                       // 70%  → break even
  }

  for (let t = 0; t < trials; t++) {
    let net = 0;
    for (let i = 0; i < totalTickets; i++) {
      net -= game.price;
      if (Math.random() < winChance) {
        const { payout, isTop } = sampleWinPayout();
        net += payout;
        if (isTop) topPrizeHits++;
      }
    }
    finalNets.push(Math.round(net));
    totalWonAll += Math.max(0, net);
    for (const b of bands) {
      if (b.test(net)) b.count++;
    }
  }

  const avgNet = finalNets.reduce((a, b) => a + b, 0) / trials;

  return {
    ticketsPerWeek,
    totalTickets,
    totalSpent,
    totalWon: Math.round(totalWonAll / trials),
    netResult: Math.round(avgNet),
    avgWinPerTicket: Math.round(avgNet / totalTickets),
    winRate: Math.round(returnRate * 100),
    topPrizeHits: Math.round(topPrizeHits / trials),
    outcomeBands: bands.map((b) => ({
      name: b.name,
      count: b.count,
      value: Math.round((b.count / trials) * 100),
    })),
  };
}

// ─── Score badge ─────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 100
      ? "text-[#00ff87] border-[#00ff87]/40 bg-[#00ff87]/10"
      : score >= 75
        ? "text-[#ffd700] border-[#ffd700]/40 bg-[#ffd700]/10"
        : score >= 50
          ? "text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10"
          : "text-[#ff2040] border-[#ff2040]/40 bg-[#ff2040]/10";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono font-bold ${color}`}>
      🏆{score}
    </span>
  );
}

// ─── Main page ───────────────────────────────────────────────────
export default function ScratchersPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ScratchersData | null>(null);
  const [selectedState, setSelectedState] = useState("fl");
  const [selectedGame, setSelectedGame] = useState<ScratcherGame | null>(null);
  const [ticketsPerWeek, setTicketsPerWeek] = useState(5);
  const [yearsPlayed, setYearsPlayed] = useState(5);
  const [trials, setTrials] = useState(5000);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<ScratchSimResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    fetch("/scratchers-data.json")
      .then((r) => r.json())
      .then((d: ScratchersData) => {
        setData(d);
        const games = d.states[selectedState]?.games ?? [];
        if (games.length > 0) setSelectedGame(games[0]);
      })
      .catch(() => {});
  }, []);

  const games = useMemo(() => {
    const all = data?.states[selectedState]?.games ?? [];
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter((g) => g.name.toLowerCase().includes(q));
  }, [data, selectedState, searchQuery]);

  const runSim = useCallback(() => {
    if (!selectedGame) return;
    setSimLoading(true);
    setSimResult(null);
    setTimeout(() => {
      const result = runScratcherSim(selectedGame, ticketsPerWeek, yearsPlayed, trials);
      setSimResult(result);
      setSimLoading(false);
    }, 50);
  }, [selectedGame, ticketsPerWeek, yearsPlayed, trials]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-[#6b6b8a] font-mono text-sm">Loading...</div>
      </div>
    );
  }

  const stateName = data?.states[selectedState]?.name ?? selectedState.toUpperCase();
  const totalSpent = selectedGame ? ticketsPerWeek * selectedGame.price * 52 * yearsPlayed : 0;

  return (
    <SiteShell active="scratchers">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <section className="pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#6b6b8a] bg-[#1e1535] border border-[#2e2560] rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
            Scratchers · {stateName} · {games.length} games tracked
          </div>

          <h1 className="text-[2rem] md:text-[3.15rem] font-black leading-[1.1] mb-7 tracking-tight mx-auto text-center">
            <span className="block">Not all scratchers are equal.</span>
            <span className="block text-[#00ff87]">Some are mathematically better.</span>
          </h1>

          <p className="text-[#6b6b8a] text-lg max-w-lg mx-auto leading-relaxed">
            States publish remaining prizes. We crunch the numbers to find which scratch-offs
            have the best odds right now — and which are a waste of money.
          </p>
        </section>

        {/* State selector */}
        <section className="max-w-xl mx-auto px-6 mb-4">
          <div className="flex gap-3 flex-wrap">
            {data &&
              Object.entries(data.states).map(([key, state]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedState(key);
                    setSelectedGame(state.games[0] ?? null);
                    setSimResult(null);
                  }}
                  className={`py-2 px-4 rounded-xl border text-sm font-bold transition-all ${
                    selectedState === key
                      ? "border-[#00ff87] bg-[#00ff87]/10 text-[#00ff87]"
                      : "border-[#1e1535] bg-[#0f0a1e]/60 text-[#6b6b8a] hover:border-[#2e2560]"
                  }`}
                >
                  {state.name}
                </button>
              ))}
          </div>
        </section>

        {/* Search + game list */}
        <section className="max-w-xl mx-auto px-6 mb-8">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl border border-[#1e1535] overflow-hidden">
            <div className="p-4 border-b border-[#1e1535]">
              <input
                type="text"
                placeholder="Search for a game..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#030014] border border-[#1e1535] rounded-xl px-4 py-2 text-sm text-[#f0f0f0] placeholder-[#6b6b8a] focus:outline-none focus:border-[#00ff87]/50"
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0f0a1e]">
                  <tr className="text-[#6b6b8a] text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-center px-2 py-2">Score</th>
                    <th className="text-right px-4 py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr
                      key={`${game.name}-${game.gameNumber}`}
                      onClick={() => {
                        setSelectedGame(game);
                        setSimResult(null);
                      }}
                      className={`cursor-pointer transition-colors border-t border-[#1e1535]/50 ${
                        selectedGame?.gameNumber === game.gameNumber
                          ? "bg-[#00ff87]/5"
                          : "hover:bg-[#1e1535]/30"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-[#f0f0f0] font-medium">
                        {game.name}
                        <span className="text-[#6b6b8a] text-xs ml-1">#{game.gameNumber}</span>
                      </td>
                      <td className="text-center px-2 py-2.5">
                        <ScoreBadge score={game.score} />
                      </td>
                      <td className="text-right px-4 py-2.5 font-mono text-[#00d4ff]">${game.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Selected game info */}
        {selectedGame && (
          <>
            <section className="max-w-xl mx-auto px-6 mb-8">
              <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-black text-[#f0f0f0]">{selectedGame.name}</h2>
                    <p className="text-[#6b6b8a] text-sm mt-1">Game #{selectedGame.gameNumber} · {stateName}</p>
                  </div>
                  <div className="text-right">
                    <ScoreBadge score={selectedGame.score} />
                    <div className="font-mono text-lg font-black text-[#00d4ff] mt-1">${selectedGame.price}</div>
                  </div>
                </div>
                <p className="text-[#6b6b8a] text-sm leading-relaxed">
                  {selectedGame.score >= 100
                    ? `This game scores 🏆${selectedGame.score} — meaning you could theoretically buy every remaining ticket and profit. It's one of the best scratchers in ${stateName} right now.`
                    : selectedGame.score >= 75
                      ? `This game scores 🏆${selectedGame.score} — above average odds. There are still valuable prizes unclaimed.`
                      : `This game scores 🏆${selectedGame.score} — below average. Most of the good prizes may already be claimed.`}
                </p>
              </div>
            </section>

            {/* Sliders */}
            <section className="max-w-xl mx-auto px-6 mb-8">
              <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
                <div className="space-y-7">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm text-[#6b6b8a]">Tickets per week</label>
                      <span className="font-mono text-2xl font-black text-[#00ff87]">{ticketsPerWeek}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={ticketsPerWeek}
                      onChange={(e) => setTicketsPerWeek(Number(e.target.value))}
                      className="w-full appearance-none h-2 rounded-full"
                      style={sliderFill(ticketsPerWeek, 1, 100, "#00ff87")}
                    />
                    <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                      <span>1</span>
                      <span>${(ticketsPerWeek * selectedGame.price).toLocaleString()}/wk</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm text-[#6b6b8a]">Years playing</label>
                      <span className="font-mono text-2xl font-black text-[#00ff87]">{yearsPlayed}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={yearsPlayed}
                      onChange={(e) => setYearsPlayed(Number(e.target.value))}
                      className="w-full appearance-none h-2 rounded-full"
                      style={sliderFill(yearsPlayed, 1, 30, "#00ff87")}
                    />
                    <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                      <span>1yr</span>
                      <span>{ticketsPerWeek * 52 * yearsPlayed} total tickets</span>
                      <span>30yr</span>
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
                      style={sliderFill(trials, 100, 6000, "#00ff87")}
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

            {/* Expected */}
            <section className="max-w-xl mx-auto px-6 mb-8">
              <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
                <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-4 font-mono">
                  Statistically expected — {yearsPlayed} years of scratching
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#030014] rounded-xl p-4 border border-[#1e1535]">
                    <div className="text-xs text-[#6b6b8a] uppercase mb-1">Total spent</div>
                    <div className="font-mono text-xl font-black text-white">${totalSpent.toLocaleString()}</div>
                    <div className="text-xs text-[#6b6b8a] mt-0.5">{(ticketsPerWeek * 52 * yearsPlayed).toLocaleString()} tickets</div>
                  </div>
                  <div className="bg-[#030014] rounded-xl p-4 border border-[#1e1535]">
                    <div className="text-xs text-[#6b6b8a] uppercase mb-1">Return rate</div>
                    <div className={`font-mono text-xl font-black ${selectedGame.score >= 100 ? "text-[#00ff87]" : selectedGame.score >= 80 ? "text-[#f97316]" : "text-[#ff2040]"}`}>
                      {selectedGame.score}%
                    </div>
                    <div className="text-xs text-[#6b6b8a] mt-0.5">{selectedGame.score >= 100 ? "positive EV — buy every ticket" : selectedGame.score >= 80 ? "above average" : "below average"}</div>
                  </div>
                  <div className="bg-[#030014] rounded-xl p-4 border border-[#1e1535] col-span-2">
                    <div className="text-xs text-[#6b6b8a] uppercase mb-1">Estimated return</div>
                    <div className="font-mono text-3xl font-black text-[#00ff87]">{selectedGame.score}%</div>
                    <div className="text-xs text-[#6b6b8a] mt-1 leading-relaxed">
                      Based on remaining prizes tracked by Dr. Lotto. A score above 100 means the remaining prizes are worth more than the remaining tickets.
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
                    className="flex-1 font-mono text-base bg-[#00ff87] hover:bg-[#00e67a] text-[#030014] border border-[#00ff87]/40 h-12 rounded-xl font-bold transition-all"
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
                  {trials.toLocaleString()} players · {ticketsPerWeek} tickets/wk · ${selectedGame.price}/ticket · {yearsPlayed} years
                </p>
              </div>
            </section>

            {/* Monte Carlo results */}
            {simResult && (
              <section className="max-w-xl mx-auto px-6 mb-12">
                <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#00ff87]/40">
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-[#00ff87]">
                        {trials.toLocaleString()} Players Simulated
                      </h2>
                      <p className="text-[#6b6b8a] text-sm mt-1">
                        {selectedGame.name} · ${selectedGame.price}/ticket · {ticketsPerWeek}/wk
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-2xl font-black ${simResult.netResult >= 0 ? "text-[#00ff87]" : "text-[#ff2040]"}`}>
                        {simResult.netResult >= 0 ? "+" : ""}${simResult.netResult.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#6b6b8a]">avg net per player</div>
                    </div>
                  </div>

                  <div className="mb-6 h-56 w-full rounded-xl border border-[#1e1535] bg-[#030014] p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simResult.outcomeBands} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                        <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" horizontal={false} vertical />
                        <XAxis type="number" stroke="#6b6b8a" tickFormatter={(v) => `${v}%`} axisLine={{ stroke: "#3a2f5f", strokeDasharray: "1 6" }} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#6b6b8a" width={90} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          formatter={(value) => [`${Number(value ?? 0)}% of players`, "Share"]}
                          contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                          labelStyle={{ color: "#f0f0f0" }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {simResult.outcomeBands.map((entry, idx) => (
                            <Cell key={entry.name} fill={BAND_COLORS[idx] ?? "#00ff87"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                    <div className={`bg-[#030014] rounded-xl p-3 border text-center ${simResult.winRate >= 100 ? "border-[#00ff87]/40" : simResult.winRate >= 80 ? "border-[#f97316]/40" : "border-[#ff2040]/40"}`}>
                      <div className={`font-mono font-black ${simResult.winRate >= 100 ? "text-[#00ff87]" : simResult.winRate >= 80 ? "text-[#f97316]" : "text-[#ff2040]"}`}>
                        {simResult.winRate}%
                      </div>
                      <div className="text-xs text-[#6b6b8a] mt-0.5">return rate</div>
                    </div>
                    <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
                      <div className="font-mono font-black text-[#ffd700]">{simResult.topPrizeHits}</div>
                      <div className="text-xs text-[#6b6b8a] mt-0.5">big wins/player</div>
                    </div>
                    <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
                      <div className="font-mono font-black text-[#ff2040]">${simResult.totalSpent.toLocaleString()}</div>
                      <div className="text-xs text-[#6b6b8a] mt-0.5">total spent</div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-[#6b6b8a]">
                    {trials.toLocaleString()} players · score 🏆{selectedGame.score} · {(selectedGame.score / 100 * 100).toFixed(0)}% estimated return
                  </div>
                </div>
              </section>
            )}

            {/* Closer */}
            <section className="max-w-xl mx-auto px-6 mb-8 text-center">
              <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#00ff87]/20">
                <h2 className="text-2xl font-black text-[#00ff87] mb-4">The best scratcher is the one you don&apos;t buy.</h2>
                <p className="text-[#6b6b8a] leading-relaxed">
                  Even the highest-scoring game still has a house edge. The only guaranteed profit is keeping your money in your pocket.
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
          </>
        )}
      </div>
    </SiteShell>
  );
}
