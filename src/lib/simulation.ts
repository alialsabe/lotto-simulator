import { LotteryGame } from "./lottery-data";

export const TICKET_COST = 2;

export interface SimParams {
  weeklySpend: number;
  yearsPlayed: number;
  trials: number;
  game: LotteryGame;
}

export interface SimPrizeCounter {
  tier: string;
  wins: number;
}

export interface SimResult {
  params: SimParams;
  totalSpent: number;
  totalWon: number;
  netLoss: number;
  avgLossPerPlayer: number;
  histogram: { bucket: string; count: number; percentage: number; color: string }[];
  medianLoss: number;
  worstLoss: number;
  bestOutcome: number;
  jackpotWins: number;
  secondPrizeWins: number;
  totalPrizeWins: number;
  avgPrizePerWin: number;
  outcomeBands: { name: string; count: number; value: number }[];
  prizes: SimPrizeCounter[];
}

function sampleTicketPrize(game: LotteryGame): { winnings: number; tier: string } {
  const r = Math.random();
  let cumulative = 0;

  for (const tier of game.prizeTiers) {
    cumulative += 1 / tier.odds;
    if (r < cumulative) {
      return {
        winnings: tier.prize === "JACKPOT" ? game.jackpotCashValue : tier.prize,
        tier: tier.match,
      };
    }
  }

  return { winnings: 0, tier: "NO_PRIZE" };
}

export function runSimulation(params: SimParams): SimResult {
  const { weeklySpend, yearsPlayed, trials, game } = params;
  const ticketsPerWeek = Math.floor(weeklySpend / TICKET_COST);
  const totalTickets = ticketsPerWeek * 52 * yearsPlayed;
  const totalSpent = totalTickets * TICKET_COST;

  const finalNetValues: number[] = [];
  const prizeCounter = new Map<string, number>();
  let totalWon = 0;
  let jackpotWins = 0;
  let secondPrizeWins = 0;
  let totalPrizeWins = 0;

  for (let t = 0; t < trials; t++) {
    let net = 0;

    for (let i = 0; i < totalTickets; i++) {
      const { winnings, tier } = sampleTicketPrize(game);
      net -= TICKET_COST;
      if (winnings > 0) {
        net += winnings;
        totalWon += winnings;
        totalPrizeWins++;
        prizeCounter.set(tier, (prizeCounter.get(tier) || 0) + 1);
        if (tier === "JACKPOT") jackpotWins++;
        if (tier === "MATCH5") secondPrizeWins++;
      }
    }

    finalNetValues.push(Math.round(net));
  }

  const sorted = [...finalNetValues].sort((a, b) => a - b);
  const avgNet = finalNetValues.reduce((a, b) => a + b, 0) / trials;
  const medianValue = sorted[Math.floor(trials / 2)] ?? 0;
  const worstValue = sorted[0] ?? 0;
  const bestValue = sorted[sorted.length - 1] ?? 0;

  const bucketCount = 24;
  const minVal = worstValue;
  const maxVal = bestValue;
  const range = maxVal - minVal || 1;
  const bucketSize = Math.max(1, Math.ceil(range / bucketCount));
  const buckets: Record<string, number> = {};

  for (const val of finalNetValues) {
    const bucketStart = Math.floor((val - minVal) / bucketSize) * bucketSize + minVal;
    const bucketEnd = bucketStart + bucketSize;
    const key = `${bucketStart}:${bucketEnd}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const histogram = Object.entries(buckets)
    .map(([bucket, count]) => {
      const [startStr] = bucket.split(":");
      const start = Number(startStr);
      return {
        bucket: start >= 0 ? `+$${start.toLocaleString()}` : `-$${Math.abs(start).toLocaleString()}`,
        count,
        percentage: Math.round((count / trials) * 100),
        color: start >= 0 ? "#00d4ff" : "#ff2040",
      };
    })
    .sort((a, b) => {
      const aNum = Number(a.bucket.replace(/[$,+-]/g, "")) * (a.bucket.startsWith("-") ? -1 : 1);
      const bNum = Number(b.bucket.replace(/[$,+-]/g, "")) * (b.bucket.startsWith("-") ? -1 : 1);
      return aNum - bNum;
    });

  const outcomeBands = [
    { name: "Lost >90%", test: (v: number) => v <= -(totalSpent * 0.9) },
    { name: "Lost 50-90%", test: (v: number) => v > -(totalSpent * 0.9) && v <= -(totalSpent * 0.5) },
    { name: "Lost <50%", test: (v: number) => v > -(totalSpent * 0.5) && v < 0 },
    { name: "Profit", test: (v: number) => v >= 0 },
  ].map((band) => ({
    name: band.name,
    count: finalNetValues.filter(band.test).length,
    value: Math.round((finalNetValues.filter(band.test).length / trials) * 100),
  }));

  return {
    params,
    totalSpent,
    totalWon: Math.round(totalWon),
    netLoss: Math.round(totalSpent * trials - totalWon),
    avgLossPerPlayer: Math.round(Math.abs(avgNet)),
    histogram,
    medianLoss: Math.abs(Math.round(medianValue)),
    worstLoss: Math.abs(Math.round(worstValue)),
    bestOutcome: Math.round(bestValue),
    jackpotWins,
    secondPrizeWins,
    totalPrizeWins,
    avgPrizePerWin: totalPrizeWins > 0 ? Math.round(totalWon / totalPrizeWins) : 0,
    outcomeBands,
    prizes: Array.from(prizeCounter.entries()).map(([tier, wins]) => ({ tier, wins })),
  };
}

export function calculateExpected(params: {
  weeklySpend: number;
  yearsPlayed: number;
  game: LotteryGame;
}) {
  const { weeklySpend, yearsPlayed, game } = params;
  const ticketsPerYear = Math.floor(weeklySpend / TICKET_COST) * 52;
  const totalTickets = ticketsPerYear * yearsPlayed;
  const totalSpent = totalTickets * TICKET_COST;

  let expectedWon = 0;
  const tierResults: { match: string; label: string; odds: number; prize: number; expectedHits: number; totalPrize: number }[] = [];

  for (const tier of game.prizeTiers) {
    const prize = tier.prize === "JACKPOT" ? game.jackpotCashValue : tier.prize;
    const expectedHits = totalTickets / tier.odds;
    const totalPrize = expectedHits * prize;
    expectedWon += totalPrize;
    tierResults.push({
      match: tier.match,
      label: tier.label,
      odds: tier.odds,
      prize,
      expectedHits,
      totalPrize,
    });
  }

  const netExpected = expectedWon - totalSpent;
  const cashReturnRate = totalSpent > 0 ? expectedWon / totalSpent : 0;

  return {
    totalSpent,
    totalTickets,
    expectedWon: Math.round(expectedWon),
    netExpected: Math.round(netExpected),
    cashReturnRate,
    advertisedReturnPct: game.advertisedReturnPct,
    tierResults,
  };
}
