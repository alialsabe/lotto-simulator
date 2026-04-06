export type BlackjackSkill = "perfect" | "average" | "beginner";

export interface BlackjackParams {
  betPerHand: number;
  handsPerHour: number;
  hoursPerWeek: number;
  yearsPlayed: number;
  skill: BlackjackSkill;
}

export interface BlackjackSimResult {
  params: BlackjackParams;
  trials: number;
  houseEdge: number;
  totalHands: number;
  totalWagered: number;
  expectedLoss: number;
  expectedReturnPct: number;
  avgLossPerPlayer: number;
  worstLoss: number;
  bestOutcome: number;
  bestPlayerProfit: number;
  worstPlayerLoss: number;
  blackjacks: number;
  busts: number;
  wins: number;
  pushes: number;
  losses: number;
  outcomeBands: { name: string; count: number; value: number }[];
  bankrollCurve: { hand: number; bankroll: number }[];
}

/*
 * Simulated blackjack model:
 *   BJ (4.8%) pays 3:2, Push (9.0%) pays 0, Win pays 1:1, Loss pays -1:1.
 *
 * Real blackjack has dealer winning more hands than player (~49% vs ~42%),
 * with the 3:2 BJ payout + doubles/splits narrowing the gap to ~0.5% edge.
 *
 * We solve for the win rate that produces the correct house edge:
 *   EV = BJ×1.5 + Push×0 + Win×1 + Lose×(-1) = -edge
 *   Win + Lose = 1 - BJ - Push
 *   → Win = (1 - BJ - Push - 1.5×BJ - edge) / 2
 *
 * This gives losses > wins, matching real blackjack behaviour.
 */
const BJ_RATE = 0.048;
const PUSH_RATE = 0.090;
const BUST_FRAC = 0.28; // fraction of losses that are player busts

const HOUSE_EDGE: Record<BlackjackSkill, number> = {
  perfect: 0.005,
  average: 0.02,
  beginner: 0.04,
};

const SKILL_LABELS: Record<BlackjackSkill, string> = {
  perfect: "Perfect strategy (0.5%)",
  average: "Average player (2%)",
  beginner: "Beginner (4%)",
};

export function getSkillLabel(skill: BlackjackSkill): string {
  return SKILL_LABELS[skill];
}

function winRate(edge: number): number {
  return (1 - BJ_RATE - PUSH_RATE - 1.5 * BJ_RATE - edge) / 2;
}

export function calculateBlackjackExpected(params: BlackjackParams) {
  const { betPerHand, handsPerHour, hoursPerWeek, yearsPlayed, skill } = params;
  const edge = HOUSE_EDGE[skill];
  const totalHands = handsPerHour * hoursPerWeek * 52 * yearsPlayed;
  const totalWagered = totalHands * betPerHand;
  const expectedLoss = totalWagered * edge;
  const expectedReturnPct = ((1 - edge) * 100).toFixed(1);

  return { edge, totalHands, totalWagered, expectedLoss, expectedReturnPct };
}

function simulateHand(
  bet: number,
  edge: number,
): { net: number; isBlackjack: boolean; isBust: boolean; outcome: "win" | "lose" | "push" } {
  const r = Math.random();
  const pWin = winRate(edge);

  // BJ (4.8%) — pays 3:2
  if (r < BJ_RATE) {
    return { net: bet * 1.5, isBlackjack: true, isBust: false, outcome: "win" };
  }
  // Push (9.0%)
  if (r < BJ_RATE + PUSH_RATE) {
    return { net: 0, isBlackjack: false, isBust: false, outcome: "push" };
  }
  // Regular win
  if (r < BJ_RATE + PUSH_RATE + pWin) {
    return { net: bet, isBlackjack: false, isBust: false, outcome: "win" };
  }
  // Loss — 28% are busts
  const isBust = Math.random() < BUST_FRAC;
  return { net: -bet, isBlackjack: false, isBust, outcome: "lose" };
}

export function runBlackjackSimulation(
  params: BlackjackParams,
  trials: number,
): BlackjackSimResult {
  const { betPerHand, handsPerHour, hoursPerWeek, yearsPlayed, skill } = params;
  const edge = HOUSE_EDGE[skill];
  const totalHands = handsPerHour * hoursPerWeek * 52 * yearsPlayed;
  const totalWagered = totalHands * betPerHand;

  const finalNetValues: number[] = [];
  let totalBlackjacks = 0;
  let totalBusts = 0;
  let totalWins = 0;
  let totalPushes = 0;
  let totalLosses = 0;
  let lastBankrollCurve: { hand: number; bankroll: number }[] = [];

  for (let t = 0; t < trials; t++) {
    let bankroll = 0;
    let blackjacks = 0;
    let busts = 0;
    let wins = 0;
    let pushes = 0;
    let losses = 0;
    const curve: { hand: number; bankroll: number }[] = [];

    for (let h = 0; h < totalHands; h++) {
      const result = simulateHand(betPerHand, edge);
      bankroll += result.net;
      if (result.isBlackjack) blackjacks++;
      if (result.isBust) busts++;
      if (result.outcome === "win") wins++;
      if (result.outcome === "push") pushes++;
      if (result.outcome === "lose") losses++;

      if (
        t === trials - 1 &&
        (h % Math.max(1, Math.floor(totalHands / 200)) === 0 || h === totalHands - 1)
      ) {
        curve.push({ hand: h + 1, bankroll: Math.round(bankroll) });
      }
    }

    finalNetValues.push(Math.round(bankroll));
    totalBlackjacks += blackjacks;
    totalBusts += busts;
    totalWins += wins;
    totalPushes += pushes;
    totalLosses += losses;
    if (t === trials - 1) lastBankrollCurve = curve;
  }

  const sorted = [...finalNetValues].sort((a, b) => a - b);
  const avgNet = finalNetValues.reduce((a, b) => a + b, 0) / trials;
  const worstValue = sorted[0] ?? 0;
  const bestValue = sorted[sorted.length - 1] ?? 0;

  // Outcome bands based on % of total wagered lost/won
  const outcomeBands = [
    {
      name: "Crushed (>3σ)",
      test: (v: number) => v <= -(totalWagered * edge * 6),
    },
    {
      name: "Heavy loss",
      test: (v: number) =>
        v > -(totalWagered * edge * 6) && v <= -(totalWagered * edge * 2),
    },
    {
      name: "Moderate loss",
      test: (v: number) =>
        v > -(totalWagered * edge * 2) && v < -(betPerHand * 10),
    },
    {
      name: "Break even ±",
      test: (v: number) => Math.abs(v) < betPerHand * 10,
    },
    {
      name: "Small profit",
      test: (v: number) =>
        v >= betPerHand * 10 && v < totalWagered * edge * 2,
    },
    {
      name: "Big winner",
      test: (v: number) => v >= totalWagered * edge * 2,
    },
  ].map((band) => ({
    name: band.name,
    count: finalNetValues.filter(band.test).length,
    value: Math.round((finalNetValues.filter(band.test).length / trials) * 100),
  }));

  return {
    params,
    trials,
    houseEdge: edge,
    totalHands,
    totalWagered,
    expectedLoss: Math.round(totalWagered * edge),
    expectedReturnPct: parseFloat(((1 - edge) * 100).toFixed(1)),
    avgLossPerPlayer: Math.round(Math.abs(avgNet)),
    worstLoss: Math.abs(Math.round(worstValue)),
    bestOutcome: Math.round(bestValue),
    bestPlayerProfit: Math.round(bestValue),
    worstPlayerLoss: Math.abs(Math.round(worstValue)),
    blackjacks: Math.round(totalBlackjacks / trials),
    busts: Math.round(totalBusts / trials),
    wins: Math.round(totalWins / trials),
    pushes: Math.round(totalPushes / trials),
    losses: Math.round(totalLosses / trials),
    outcomeBands,
    bankrollCurve: lastBankrollCurve,
  };
}
