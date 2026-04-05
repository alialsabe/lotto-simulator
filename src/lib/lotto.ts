// Powerball odds: 1 in 292,201,338
// Mega Millions: 1 in 302,575,350
// We'll use Powerball as default

export const JACKPOT_ODDS = 292_201_338;

export interface LottoResult {
  weeklySpend: number;
  yearsPlayed: number;
  totalSpent: number;
  totalTickets: number;
  expectedWins: number;
  oddsText: string;
  // Real-world comparisons
  grainOfSandComparison: string;
  cupComparison: string;
  swimmingPoolComparison: string;
  // What this money could do
  debtPayoffMonths: number;
  savingsGrowth: number;
  // Timeline data
  yearlyBurn: number[];
  yearlyLabels: string[];
}

export function calculateLotto(params: {
  weeklySpend: number;
  yearsPlayed: number;
  jackpotOdds?: number;
}): LottoResult {
  const { weeklySpend, yearsPlayed, jackpotOdds = JACKPOT_ODDS } = params;

  const weeksPerYear = 52;
  const totalSpent = weeklySpend * weeksPerYear * yearsPlayed;
  const totalTickets = Math.floor(totalSpent / 2); // ~$2 per ticket
  const expectedWins = totalTickets / jackpotOdds;

  // Real-world comparisons for the jackpot odds
  // 1 in 292 million
  // A grain of sand = ~1mm diameter, a teaspoon = ~5000 grains
  // An Olympic swimming pool = ~25m x 50m x 2m = 2.5 million liters = ~2.5 billion grains

  const grainComparison = jackpotOdds.toLocaleString();
  const cupsNeeded = Math.ceil(jackpotOdds / 300); // ~300 grains of rice per cup
  const poolsNeeded = jackpotOdds / 2_500_000_000;

  // What if you saved instead?
  // Debt payoff (assume $5k avg credit card debt at 24% APR minimum payment)
  const avgDebt = 5000;
  const minPayment = 150;
  const monthlyInterest = (24 / 100 / 12) * avgDebt;
  let balance = avgDebt;
  let monthsDebtFree = 0;
  let totalPaid = 0;
  const monthlyPayment = Math.max(minPayment, weeklySpend * 4.33);

  while (balance > 0 && monthsDebtFree < 600) {
    const interest = (24 / 100 / 12) * balance;
    const principal = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principal);
    totalPaid += monthlyPayment;
    monthsDebtFree++;
    if (balance <= 0) break;
  }

  // Savings growth (S&P 500 historical ~10% annual return)
  const annualReturn = 0.10;
  let savings = 0;
  const yearlySavings: number[] = [];
  const yearlyLabels: string[] = [];
  const yearlyBurn: number[] = [];

  for (let y = 1; y <= yearsPlayed; y++) {
    savings = (savings + weeklySpend * weeksPerYear) * (1 + annualReturn);
    yearlySavings.push(Math.round(savings));
    yearlyBurn.push(Math.round(weeklySpend * weeksPerYear * y));
    yearlyLabels.push(`Year ${y}`);
  }

  return {
    weeklySpend,
    yearsPlayed,
    totalSpent,
    totalTickets,
    expectedWins,
    oddsText: `1 in ${jackpotOdds.toLocaleString()}`,
    grainOfSandComparison: grainComparison,
    cupComparison: cupsNeeded > 1_000_000
      ? `${(cupsNeeded / 1_000_000).toFixed(0)}M cups of rice`
      : `${(cupsNeeded / 1000).toFixed(0)}K cups of rice`,
    swimmingPoolComparison: `${poolsNeeded.toFixed(1)} Olympic swimming pools`,
    debtPayoffMonths: monthsDebtFree,
    savingsGrowth: Math.round(savings),
    yearlyBurn,
    yearlyLabels,
  };
}
