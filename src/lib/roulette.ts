export type RouletteWheel = "american" | "european";
export type RouletteBetType = "even_money" | "dozen" | "straight";

export interface RouletteParams {
  betPerSpin: number;
  spinsPerHour: number;
  hoursPerWeek: number;
  yearsPlayed: number;
  wheel: RouletteWheel;
  betType: RouletteBetType;
}

export interface RouletteSimResult {
  params: RouletteParams;
  houseEdge: number;
  totalSpins: number;
  totalWagered: number;
  expectedLoss: number;
  expectedReturnPct: number;
  avgLossPerPlayer: number;
  worstLoss: number;
  bestOutcome: number;
  redWins: number;
  blackWins: number;
  greenHits: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  outcomeBands: { name: string; count: number; value: number }[];
  bankrollCurve: { spin: number; bankroll: number }[];
}

const HOUSE_EDGE: Record<RouletteWheel, Record<RouletteBetType, number>> = {
  american: { even_money: 0.0526, dozen: 0.0526, straight: 0.0526 },
  european: { even_money: 0.027, dozen: 0.027, straight: 0.027 },
};

const PAYOUT: Record<RouletteBetType, number> = {
  even_money: 1,
  dozen: 2,
  straight: 35,
};

const WHEEL_LABELS: Record<RouletteWheel, string> = {
  american: "American (0, 00)",
  european: "European (single 0)",
};

const BET_LABELS: Record<RouletteBetType, string> = {
  even_money: "Even money (red/black)",
  dozen: "Dozen (12 numbers)",
  straight: "Straight up (single number)",
};

export function getWheelLabel(w: RouletteWheel): string {
  return WHEEL_LABELS[w];
}

export function getBetLabel(b: RouletteBetType): string {
  return BET_LABELS[b];
}

export function calculateRouletteExpected(params: RouletteParams) {
  const { betPerSpin, spinsPerHour, hoursPerWeek, yearsPlayed, wheel, betType } = params;
  const edge = HOUSE_EDGE[wheel][betType];
  const totalSpins = spinsPerHour * hoursPerWeek * 52 * yearsPlayed;
  const totalWagered = totalSpins * betPerSpin;
  const expectedLoss = totalWagered * edge;
  const expectedReturnPct = ((1 - edge) * 100).toFixed(1);

  return { edge, totalSpins, totalWagered, expectedLoss, expectedReturnPct };
}

function spinRoulette(wheel: RouletteWheel, betType: RouletteBetType, bet: number): { net: number; color: "red" | "black" | "green" } {
  const slots = wheel === "american" ? 38 : 37; // 36 numbers + 0 (+ 00 for american)
  const result = Math.floor(Math.random() * slots);

  // 0 = green, 00 (slot 37) = green
  const isGreen = result === 0 || (wheel === "american" && result === 37);

  // Red numbers on a roulette wheel
  const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const isRed = !isGreen && redNumbers.has(result);
  const color = isGreen ? "green" : isRed ? "red" : "black";

  if (betType === "even_money") {
    if (isGreen) return { net: -bet, color };
    // For even money, player wins ~48.6% on european, ~47.4% on american
    // Simplified: red/black each have 18/37 or 18/38 probability
    const winColor = Math.random() < 0.5 ? "red" : "black";
    if (color === winColor) return { net: bet, color };
    return { net: -bet, color };
  }

  if (betType === "dozen") {
    const dozen = Math.floor(Math.random() * 3); // 0, 1, 2
    const resultDozen = result >= 1 && result <= 12 ? 0 : result >= 13 && result <= 24 ? 1 : result >= 25 && result <= 36 ? 2 : -1;
    if (resultDozen === dozen) return { net: bet * 2, color };
    return { net: -bet, color };
  }

  // Straight up
  const pick = Math.floor(Math.random() * 36) + 1;
  if (result === pick) return { net: bet * 35, color };
  return { net: -bet, color };
}

export function runRouletteSimulation(params: RouletteParams, trials: number): RouletteSimResult {
  const { betPerSpin, spinsPerHour, hoursPerWeek, yearsPlayed, wheel, betType } = params;
  const totalSpins = spinsPerHour * hoursPerWeek * 52 * yearsPlayed;
  const totalWagered = totalSpins * betPerSpin;

  const finalNetValues: number[] = [];
  let totalReds = 0;
  let totalBlacks = 0;
  let totalGreens = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let lastBankrollCurve: { spin: number; bankroll: number }[] = [];

  for (let t = 0; t < trials; t++) {
    let bankroll = 0;
    let reds = 0;
    let blacks = 0;
    let greens = 0;
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let winStreak = 0;
    let loseStreak = 0;
    const curve: { spin: number; bankroll: number }[] = [];

    for (let s = 0; s < totalSpins; s++) {
      const result = spinRoulette(wheel, betType, betPerSpin);
      bankroll += result.net;
      if (result.color === "red") reds++;
      if (result.color === "black") blacks++;
      if (result.color === "green") greens++;

      if (result.net > 0) {
        currentWinStreak++;
        currentLoseStreak = 0;
        winStreak = Math.max(winStreak, currentWinStreak);
      } else if (result.net < 0) {
        currentLoseStreak++;
        currentWinStreak = 0;
        loseStreak = Math.max(loseStreak, currentLoseStreak);
      }

      if (t === trials - 1 && (s % Math.max(1, Math.floor(totalSpins / 200)) === 0 || s === totalSpins - 1)) {
        curve.push({ spin: s + 1, bankroll: Math.round(bankroll) });
      }
    }

    finalNetValues.push(Math.round(bankroll));
    totalReds += reds;
    totalBlacks += blacks;
    totalGreens += greens;
    maxWinStreak = Math.max(maxWinStreak, winStreak);
    maxLoseStreak = Math.max(maxLoseStreak, loseStreak);
    if (t === trials - 1) lastBankrollCurve = curve;
  }

  const sorted = [...finalNetValues].sort((a, b) => a - b);
  const avgNet = finalNetValues.reduce((a, b) => a + b, 0) / trials;
  const worstValue = sorted[0] ?? 0;
  const bestValue = sorted[sorted.length - 1] ?? 0;

  const outcomeBands = [
    { name: "Lost big (>90%)", test: (v: number) => v <= -(totalWagered * 0.05) * 3 },
    { name: "Lost moderate", test: (v: number) => v <= -(totalWagered * 0.01) && v > -(totalWagered * 0.05) * 3 },
    { name: "Lost small", test: (v: number) => v < 0 && v > -(totalWagered * 0.01) },
    { name: "Break even ±", test: (v: number) => Math.abs(v) < betPerSpin * 20 },
    { name: "Won small", test: (v: number) => v > 0 && v < totalWagered * 0.01 },
    { name: "Won big", test: (v: number) => v >= totalWagered * 0.01 },
  ].map((band) => ({
    name: band.name,
    count: finalNetValues.filter(band.test).length,
    value: Math.round((finalNetValues.filter(band.test).length / trials) * 100),
  }));

  return {
    params,
    houseEdge: HOUSE_EDGE[wheel][betType],
    totalSpins,
    totalWagered,
    expectedLoss: Math.round(totalWagered * HOUSE_EDGE[wheel][betType]),
    expectedReturnPct: parseFloat(((1 - HOUSE_EDGE[wheel][betType]) * 100).toFixed(1)),
    avgLossPerPlayer: Math.round(Math.abs(avgNet)),
    worstLoss: Math.abs(Math.round(worstValue)),
    bestOutcome: Math.round(bestValue),
    redWins: Math.round(totalReds / trials),
    blackWins: Math.round(totalBlacks / trials),
    greenHits: Math.round(totalGreens / trials),
    longestWinStreak: maxWinStreak,
    longestLoseStreak: maxLoseStreak,
    outcomeBands,
    bankrollCurve: lastBankrollCurve,
  };
}
