"use client";

import { useMemo, useState } from "react";
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
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import {
  PORTFOLIOS,
  formatMoneyCompact,
  runInvestingSimulation,
  type InvestingResult,
  type PortfolioKey,
} from "@/lib/investing";

function sliderFill(value: number, min: number, max: number, color: string) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return {
    backgroundImage: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #241a40 ${pct}%, #241a40 100%)`,
    backgroundColor: "transparent",
  };
}

function Money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function InvestingInfo() {
  return (
    <span className="relative group inline-flex items-center ml-2 cursor-help">
      <span className="w-5 h-5 rounded-full border border-[#6b6b8a]/50 text-[#6b6b8a] text-xs font-bold flex items-center justify-center hover:border-[#00ff87] hover:text-[#00ff87] transition-colors">
        i
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-xl bg-[#0f0a1e] border border-[#1e1535] text-xs text-[#b0b0c8] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
        This runs thousands of market paths with the same monthly saving habit. You are not seeing one rosy average — you are seeing the range of likely outcomes after volatility, fees, taxes, and inflation.
      </span>
    </span>
  );
}

function Results({ result }: { result: InvestingResult }) {
  const pathColors = {
    p10: "#ff2040",
    median: "#00ff87",
    p90: "#00d4ff",
  };
  const bandColors = ["#ff2040", "#f59e0b", "#00d4ff", "#00ff87"];

  return (
    <>
      <section className="max-w-5xl mx-auto px-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#00ff87]/30">
            <div className="text-xs text-[#6b6b8a] uppercase mb-1">Median ending balance</div>
            <div className="font-mono text-3xl font-black text-[#00ff87]">{Money(result.medianEndingBalance)}</div>
            <div className="text-xs text-[#6b6b8a] mt-2">Half of outcomes finish above this. Half finish below.</div>
          </div>

          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#00d4ff]/30">
            <div className="text-xs text-[#6b6b8a] uppercase mb-1">Median passive income</div>
            <div className="font-mono text-3xl font-black text-[#00d4ff]">{Money(result.medianPassiveIncomeAnnual)}/yr</div>
            <div className="text-xs text-[#6b6b8a] mt-2">Estimated from the portfolio&rsquo;s income yield at the end.</div>
          </div>

          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#ffd700]/30">
            <div className="text-xs text-[#6b6b8a] uppercase mb-1">Chance of hitting target</div>
            <div className="font-mono text-3xl font-black text-[#ffd700]">{result.chanceHitTargetPct}%</div>
            <div className="text-xs text-[#6b6b8a] mt-2">Chance you finish at or above {formatMoneyCompact(result.params.targetBalance)}.</div>
          </div>

          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#ff2040]/30">
            <div className="text-xs text-[#6b6b8a] uppercase mb-1">Chance below contributions</div>
            <div className="font-mono text-3xl font-black text-[#ff2040]">{result.chanceBelowContributionsPct}%</div>
            <div className="text-xs text-[#6b6b8a] mt-2">Chance you end with less than the money you personally put in.</div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 mb-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black text-white">Possible wealth paths</h2>
                <p className="text-sm text-[#6b6b8a] mt-1">10th, 50th, and 90th percentile balances over time.</p>
              </div>
              <div className="text-right text-xs text-[#6b6b8a]">
                <div>{result.params.trials.toLocaleString()} trials</div>
                <div>{result.params.years} years</div>
              </div>
            </div>

            <div className="h-80 rounded-xl border border-[#1e1535] bg-[#030014] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.path} margin={{ top: 10, right: 20, left: 12, bottom: 8 }}>
                  <defs>
                    <linearGradient id="medianGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ff87" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00ff87" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" />
                  <XAxis dataKey="year" stroke="#6b6b8a" tickLine={false} axisLine={{ stroke: "#3a2f5f" }} />
                  <YAxis
                    stroke="#6b6b8a"
                    tickFormatter={(value) => formatMoneyCompact(Number(value))}
                    tickLine={false}
                    axisLine={{ stroke: "#3a2f5f" }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                    labelStyle={{ color: "#f0f0f0" }}
                    formatter={(value, name) => [Money(Number(value ?? 0)), String(name).toUpperCase()]}
                    labelFormatter={(value) => `Year ${Number(value)}`}
                  />
                  <Area type="monotone" dataKey="p10" stroke={pathColors.p10} fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="p90" stroke={pathColors.p90} fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="median" stroke={pathColors.median} fill="url(#medianGlow)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
              <div className="rounded-xl border border-[#ff2040]/25 bg-[#030014] p-3">
                <div className="font-mono font-black text-[#ff2040]">{Money(result.worstEndingBalance)}</div>
                <div className="text-[#6b6b8a] mt-1">Worst path</div>
              </div>
              <div className="rounded-xl border border-[#00ff87]/25 bg-[#030014] p-3">
                <div className="font-mono font-black text-[#00ff87]">{Money(result.medianEndingBalance)}</div>
                <div className="text-[#6b6b8a] mt-1">Median path</div>
              </div>
              <div className="rounded-xl border border-[#00d4ff]/25 bg-[#030014] p-3">
                <div className="font-mono font-black text-[#00d4ff]">{Money(result.bestEndingBalance)}</div>
                <div className="text-[#6b6b8a] mt-1">Best path</div>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
            <h2 className="text-2xl font-black text-white mb-1">Outcome odds</h2>
            <p className="text-sm text-[#6b6b8a] mb-5">What your saving habit most often turns into.</p>
            <div className="h-80 rounded-xl border border-[#1e1535] bg-[#030014] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.outcomeBands} layout="vertical" margin={{ top: 8, right: 10, left: 18, bottom: 8 }}>
                  <CartesianGrid stroke="#2b2148" strokeDasharray="1 6" horizontal={false} vertical />
                  <XAxis type="number" stroke="#6b6b8a" tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={{ stroke: "#3a2f5f" }} />
                  <YAxis type="category" dataKey="name" width={120} stroke="#6b6b8a" />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    formatter={(value) => [`${Number(value ?? 0)}%`, "Share"]}
                    contentStyle={{ backgroundColor: "#030014", border: "1px solid #1e1535", borderRadius: 12 }}
                    labelStyle={{ color: "#f0f0f0" }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {result.outcomeBands.map((entry, idx) => (
                      <Cell key={entry.name} fill={bandColors[idx] ?? "#00ff87"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 mt-4 text-sm">
              <div className="rounded-xl border border-[#1e1535] bg-[#030014] p-3 flex items-center justify-between gap-4">
                <span className="text-[#6b6b8a]">Chance inflation still beats you</span>
                <span className="font-mono font-black text-[#ff2040]">{result.chanceLoseToInflationPct}%</span>
              </div>
              <div className="rounded-xl border border-[#1e1535] bg-[#030014] p-3 flex items-center justify-between gap-4">
                <span className="text-[#6b6b8a]">Median real ending balance</span>
                <span className="font-mono font-black text-[#00d4ff]">{Money(result.medianRealEndingBalance)}</span>
              </div>
              <div className="rounded-xl border border-[#1e1535] bg-[#030014] p-3 flex items-center justify-between gap-4">
                <span className="text-[#6b6b8a]">Chance of doubling your target</span>
                <span className="font-mono font-black text-[#00ff87]">{result.chanceDoubleTargetPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function InvestingPage() {
  const [portfolioKey, setPortfolioKey] = useState<PortfolioKey>("growth");
  const portfolio = useMemo(
    () => PORTFOLIOS.find((item) => item.key === portfolioKey) ?? PORTFOLIOS[1],
    [portfolioKey],
  );

  const [initialInvestment, setInitialInvestment] = useState(1000);
  const [monthlyContribution, setMonthlyContribution] = useState(300);
  const [years, setYears] = useState(20);
  const [expectedReturnPct, setExpectedReturnPct] = useState(portfolio.nominalReturnPct);
  const [volatilityPct, setVolatilityPct] = useState(portfolio.volatilityPct);
  const [inflationPct, setInflationPct] = useState(3);
  const [feesPct, setFeesPct] = useState(0.25);
  const [taxDragPct, setTaxDragPct] = useState(0.5);
  const [targetBalance, setTargetBalance] = useState(100000);
  const [trials, setTrials] = useState(5000);
  const [result, setResult] = useState<InvestingResult | null>(() =>
    runInvestingSimulation({
      initialInvestment: 1000,
      monthlyContribution: 300,
      years: 20,
      trials: 5000,
      expectedReturnPct: portfolio.nominalReturnPct,
      volatilityPct: portfolio.volatilityPct,
      inflationPct: 3,
      feesPct: 0.25,
      taxDragPct: 0.5,
      targetBalance: 100000,
      passiveIncomeYieldPct: portfolio.passiveIncomeYieldPct,
    }),
  );

  const contributionsTotal = initialInvestment + monthlyContribution * years * 12;
  const weeklyRedirect = Math.round((monthlyContribution * 12) / 52);

  const rerun = () => {
    setResult(
      runInvestingSimulation({
        initialInvestment,
        monthlyContribution,
        years,
        trials,
        expectedReturnPct,
        volatilityPct,
        inflationPct,
        feesPct,
        taxDragPct,
        targetBalance,
        passiveIncomeYieldPct: portfolio.passiveIncomeYieldPct,
      }),
    );
  };

  const applyPortfolio = (key: PortfolioKey) => {
    const next = PORTFOLIOS.find((item) => item.key === key) ?? PORTFOLIOS[0];
    setPortfolioKey(next.key);
    setExpectedReturnPct(next.nominalReturnPct);
    setVolatilityPct(next.volatilityPct);
  };

  return (
    <SiteShell active="investing">
      <div className="max-w-5xl mx-auto">
        <section className="pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#6b6b8a] bg-[#1e1535] border border-[#2e2560] rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
            Investing tab · Redirect about ${weeklyRedirect}/week instead of burning it
          </div>

          <h1 className="text-[2rem] md:text-[3.2rem] font-black leading-[1.05] tracking-tight mb-6">
            The lottery burns the money.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff87] via-[#00d4ff] to-[#ffd700]">
              Investing gives it time to grow teeth.
            </span>
          </h1>

          <p className="text-[#6b6b8a] text-lg max-w-3xl mx-auto leading-relaxed">
            Same habit. Same cash leaving your checking account. Totally different ending. This page shows what disciplined compounding can do after volatility, inflation, fees, and taxes take their cut.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
              <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-4 font-mono">Choose the compounding machine</div>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {PORTFOLIOS.map((item) => {
                  const isActive = portfolio.key === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => applyPortfolio(item.key)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? "border-[#00ff87]/40 bg-[#00ff87]/8 shadow-[0_0_25px_rgba(0,255,135,0.08)]"
                          : "border-[#1e1535] bg-[#030014] hover:border-[#2e2560]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className={`font-black ${isActive ? "text-[#00ff87]" : "text-white"}`}>{item.name}</span>
                        <span className="text-xs font-mono text-[#6b6b8a]">{item.nominalReturnPct.toFixed(1)}% / {item.volatilityPct.toFixed(1)}%</span>
                      </div>
                      <p className="text-sm text-[#6b6b8a] mb-3">{item.description}</p>
                      <div className="grid grid-cols-4 gap-2 text-[11px] text-[#6b6b8a]">
                        <span>Stocks {item.stocks}%</span>
                        <span>Bonds {item.bonds}%</span>
                        <span>RE {item.realEstate}%</span>
                        <span>Cash {item.cash}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-7">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Starting amount</label>
                    <span className="font-mono text-2xl font-black text-white">{Money(initialInvestment)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100000}
                    step={500}
                    value={initialInvestment}
                    onChange={(e) => setInitialInvestment(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(initialInvestment, 0, 100000, "#00d4ff")}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Monthly contribution</label>
                    <span className="font-mono text-2xl font-black text-[#00ff87]">{Money(monthlyContribution)}</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={5000}
                    step={25}
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(monthlyContribution, 25, 5000, "#00ff87")}
                  />
                  <div className="flex justify-between text-xs text-[#6b6b8a] mt-1">
                    <span>$25/mo</span>
                    <span>≈ ${weeklyRedirect}/week redirected</span>
                    <span>$5,000/mo</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Time horizon</label>
                    <span className="font-mono text-2xl font-black text-[#ffd700]">{years} years</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(years, 1, 50, "#ffd700")}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Target balance</label>
                    <span className="font-mono text-2xl font-black text-[#00d4ff]">{formatMoneyCompact(targetBalance)}</span>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={2000000}
                    step={10000}
                    value={targetBalance}
                    onChange={(e) => setTargetBalance(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(targetBalance, 10000, 2000000, "#7c3aed")}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-6 border border-[#1e1535]">
              <div className="text-xs text-[#6b6b8a] uppercase tracking-wider mb-4 font-mono">Stress test the assumptions</div>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Expected return</label>
                    <span className="font-mono text-xl font-black text-white">{expectedReturnPct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={0.1}
                    value={expectedReturnPct}
                    onChange={(e) => setExpectedReturnPct(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(expectedReturnPct, 2, 14, "#00d4ff")}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Volatility</label>
                    <span className="font-mono text-xl font-black text-[#ff2040]">{volatilityPct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={0.5}
                    value={volatilityPct}
                    onChange={(e) => setVolatilityPct(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(volatilityPct, 3, 30, "#ff2040")}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Inflation</label>
                    <span className="font-mono text-xl font-black text-[#ffd700]">{inflationPct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.1}
                    value={inflationPct}
                    onChange={(e) => setInflationPct(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(inflationPct, 0, 8, "#ffd700")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm text-[#6b6b8a]">Fees</label>
                      <span className="font-mono text-lg font-black text-[#6b6b8a]">{feesPct.toFixed(2)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={feesPct}
                      onChange={(e) => setFeesPct(Number(e.target.value))}
                      className="w-full appearance-none h-2 rounded-full"
                      style={sliderFill(feesPct, 0, 2, "#6b6b8a")}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm text-[#6b6b8a]">Tax drag</label>
                      <span className="font-mono text-lg font-black text-[#6b6b8a]">{taxDragPct.toFixed(2)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={0.05}
                      value={taxDragPct}
                      onChange={(e) => setTaxDragPct(Number(e.target.value))}
                      className="w-full appearance-none h-2 rounded-full"
                      style={sliderFill(taxDragPct, 0, 3, "#6b6b8a")}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-[#6b6b8a]">Monte Carlo trials</label>
                    <span className="font-mono text-xl font-black text-[#7c3aed]">{trials.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={6000}
                    step={500}
                    value={trials}
                    onChange={(e) => setTrials(Number(e.target.value))}
                    className="w-full appearance-none h-2 rounded-full"
                    style={sliderFill(trials, 500, 6000, "#7c3aed")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-xl border border-[#1e1535] bg-[#030014] p-4">
                  <div className="text-xs text-[#6b6b8a] uppercase mb-1">You contribute</div>
                  <div className="font-mono text-xl font-black text-white">{Money(contributionsTotal)}</div>
                  <div className="text-xs text-[#6b6b8a] mt-1">Across {years} years</div>
                </div>
                <div className="rounded-xl border border-[#1e1535] bg-[#030014] p-4">
                  <div className="text-xs text-[#6b6b8a] uppercase mb-1">Income yield</div>
                  <div className="font-mono text-xl font-black text-[#00d4ff]">{portfolio.passiveIncomeYieldPct.toFixed(1)}%</div>
                  <div className="text-xs text-[#6b6b8a] mt-1">Dividends / rent proxy</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center w-full max-w-xl">
              <Button
                onClick={rerun}
                className="flex-1 font-mono text-base bg-[#00ff87] text-[#030014] hover:bg-[#4dffab] border border-[#00ff87]/40 h-12"
              >
                Run Investing Simulation ({trials.toLocaleString()} paths)
              </Button>
              <InvestingInfo />
            </div>
            <p className="text-xs text-[#6b6b8a] text-center">
              This is the hopeful mirror image of the lottery tab: the same money flow, redirected into assets instead of odds.
            </p>
          </div>
        </section>

        {result && <Results result={result} />}

        <section className="max-w-5xl mx-auto px-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#1e1535]">
              <div className="text-xs text-[#6b6b8a] uppercase mb-2">The contrast</div>
              <div className="text-2xl font-black text-white mb-2">Lottery = burn rate</div>
              <p className="text-sm text-[#6b6b8a] leading-relaxed">Most paths go backward. The expected value is negative, and the hope is sold through rarity.</p>
            </div>
            <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#00ff87]/20">
              <div className="text-xs text-[#6b6b8a] uppercase mb-2">The investing tab</div>
              <div className="text-2xl font-black text-[#00ff87] mb-2">Investing = ownership</div>
              <p className="text-sm text-[#6b6b8a] leading-relaxed">You still accept randomness, but the math is finally pointed in your direction instead of against you.</p>
            </div>
            <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-5 border border-[#ffd700]/20">
              <div className="text-xs text-[#6b6b8a] uppercase mb-2">What matters most</div>
              <div className="text-2xl font-black text-[#ffd700] mb-2">Time and behavior</div>
              <p className="text-sm text-[#6b6b8a] leading-relaxed">The biggest lever is not finding a magic asset. It is redirecting cash consistently and not quitting during drawdowns.</p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-24 text-center">
          <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#00ff87]/20">
            <h2 className="text-2xl font-black text-[#00ff87] mb-4">This is what hope looks like when the math is on your side.</h2>
            <p className="text-[#6b6b8a] leading-relaxed max-w-3xl mx-auto">
              You do not need a miracle ticket. You need a repeatable habit, enough time, and a portfolio that survives your emotions. The real flex is boring money that compounds anyway.
            </p>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
