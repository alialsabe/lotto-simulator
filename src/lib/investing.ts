export type PortfolioKey = "balanced" | "growth" | "real-assets" | "aggressive";

export interface PortfolioPreset {
  key: PortfolioKey;
  name: string;
  description: string;
  stocks: number;
  bonds: number;
  realEstate: number;
  cash: number;
  nominalReturnPct: number;
  volatilityPct: number;
  passiveIncomeYieldPct: number;
}

export const PORTFOLIOS: PortfolioPreset[] = [
  {
    key: "balanced",
    name: "Balanced",
    description: "60/25/10/5 — steady, diversified compounding.",
    stocks: 60,
    bonds: 25,
    realEstate: 10,
    cash: 5,
    nominalReturnPct: 7.2,
    volatilityPct: 11,
    passiveIncomeYieldPct: 3.1,
  },
  {
    key: "growth",
    name: "Growth",
    description: "75/10/10/5 — more upside, more drawdowns.",
    stocks: 75,
    bonds: 10,
    realEstate: 10,
    cash: 5,
    nominalReturnPct: 8.6,
    volatilityPct: 15,
    passiveIncomeYieldPct: 2.4,
  },
  {
    key: "real-assets",
    name: "Real Assets",
    description: "50/15/25/10 — more rent and inflation hedging.",
    stocks: 50,
    bonds: 15,
    realEstate: 25,
    cash: 10,
    nominalReturnPct: 7.6,
    volatilityPct: 12.5,
    passiveIncomeYieldPct: 3.8,
  },
  {
    key: "aggressive",
    name: "Aggressive",
    description: "90/0/5/5 — biggest swings, biggest long-run upside.",
    stocks: 90,
    bonds: 0,
    realEstate: 5,
    cash: 5,
    nominalReturnPct: 10,
    volatilityPct: 19,
    passiveIncomeYieldPct: 1.8,
  },
];

export interface InvestingParams {
  initialInvestment: number;
  monthlyContribution: number;
  years: number;
  trials: number;
  expectedReturnPct: number;
  volatilityPct: number;
  inflationPct: number;
  feesPct: number;
  taxDragPct: number;
  targetBalance: number;
  passiveIncomeYieldPct: number;
}

export interface InvestingPathPoint {
  year: number;
  p10: number;
  median: number;
  p90: number;
}

export interface InvestingOutcomeBand {
  name: string;
  value: number;
}

export interface InvestingResult {
  params: InvestingParams;
  contributionsTotal: number;
  medianEndingBalance: number;
  bestEndingBalance: number;
  worstEndingBalance: number;
  medianRealEndingBalance: number;
  chanceBelowContributionsPct: number;
  chanceLoseToInflationPct: number;
  chanceHitTargetPct: number;
  chanceDoubleTargetPct: number;
  medianPassiveIncomeAnnual: number;
  path: InvestingPathPoint[];
  outcomeBands: InvestingOutcomeBand[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percentile(sorted: number[], pct: number) {
  if (sorted.length === 0) return 0;
  const index = clamp(Math.floor((sorted.length - 1) * pct), 0, sorted.length - 1);
  return sorted[index] ?? 0;
}

function randomNormal() {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runInvestingSimulation(params: InvestingParams): InvestingResult {
  const {
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
    passiveIncomeYieldPct,
  } = params;

  const months = years * 12;
  const netAnnualReturn = (expectedReturnPct - feesPct - taxDragPct) / 100;
  const annualVolatility = volatilityPct / 100;
  const monthlyMean = Math.pow(1 + netAnnualReturn, 1 / 12) - 1;
  const monthlyVol = annualVolatility / Math.sqrt(12);
  const inflationFactor = Math.pow(1 + inflationPct / 100, years);
  const contributionsTotal = Math.round(initialInvestment + monthlyContribution * months);

  const yearlySnapshots: number[][] = Array.from({ length: years + 1 }, () => []);
  const endingBalances: number[] = [];
  const endingRealBalances: number[] = [];

  for (let trial = 0; trial < trials; trial++) {
    let balance = initialInvestment;
    yearlySnapshots[0]?.push(balance);

    for (let month = 1; month <= months; month++) {
      balance += monthlyContribution;
      const monthlyReturn = clamp(monthlyMean + monthlyVol * randomNormal(), -0.75, 1.2);
      balance *= 1 + monthlyReturn;

      if (month % 12 === 0) {
        yearlySnapshots[month / 12]?.push(Math.max(0, balance));
      }
    }

    const finalBalance = Math.max(0, balance);
    endingBalances.push(finalBalance);
    endingRealBalances.push(finalBalance / inflationFactor);
  }

  const sortedEnding = [...endingBalances].sort((a, b) => a - b);
  const sortedRealEnding = [...endingRealBalances].sort((a, b) => a - b);

  const path = yearlySnapshots.map((values, index) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      year: index,
      p10: Math.round(percentile(sorted, 0.1)),
      median: Math.round(percentile(sorted, 0.5)),
      p90: Math.round(percentile(sorted, 0.9)),
    };
  });

  const belowContributionsCount = endingBalances.filter((value) => value < contributionsTotal).length;
  const loseToInflationCount = endingRealBalances.filter((value) => value < contributionsTotal).length;
  const hitTargetCount = endingBalances.filter((value) => value >= targetBalance).length;
  const doubleTargetCount = endingBalances.filter((value) => value >= targetBalance * 2).length;

  const outcomeBands = [
    {
      name: "Below what you put in",
      value: Math.round((belowContributionsCount / trials) * 100),
    },
    {
      name: "Above contributions",
      value: Math.round((endingBalances.filter((value) => value >= contributionsTotal && value < targetBalance).length / trials) * 100),
    },
    {
      name: `Hit ${formatMoneyCompact(targetBalance)}`,
      value: Math.round((hitTargetCount / trials) * 100),
    },
    {
      name: `Hit ${formatMoneyCompact(targetBalance * 2)}`,
      value: Math.round((doubleTargetCount / trials) * 100),
    },
  ];

  const medianEndingBalance = Math.round(percentile(sortedEnding, 0.5));

  return {
    params,
    contributionsTotal,
    medianEndingBalance,
    bestEndingBalance: Math.round(sortedEnding[sortedEnding.length - 1] ?? 0),
    worstEndingBalance: Math.round(sortedEnding[0] ?? 0),
    medianRealEndingBalance: Math.round(percentile(sortedRealEnding, 0.5)),
    chanceBelowContributionsPct: Math.round((belowContributionsCount / trials) * 100),
    chanceLoseToInflationPct: Math.round((loseToInflationCount / trials) * 100),
    chanceHitTargetPct: Math.round((hitTargetCount / trials) * 100),
    chanceDoubleTargetPct: Math.round((doubleTargetCount / trials) * 100),
    medianPassiveIncomeAnnual: Math.round(medianEndingBalance * (passiveIncomeYieldPct / 100)),
    path,
    outcomeBands,
  };
}

export function formatMoneyCompact(value: number) {
  const abs = Math.abs(value);
  const prefix = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) return `${prefix}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}$${Math.round(abs / 1_000)}K`;

  return `${prefix}$${Math.round(abs).toLocaleString()}`;
}
