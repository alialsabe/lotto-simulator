export interface PrizeTier {
  match: string;
  label: string;
  prize: number | "JACKPOT";
  odds: number;
}

export interface LotteryGame {
  id: string;
  name: string;
  jackpot: number;
  jackpotCashValue: number;
  lastDraw: string;
  nextDraw: string;
  odds: {
    jackpot: number;
    anyPrize: number;
  };
  prizeTiers: PrizeTier[];
  advertisedReturnPct: number;
}

export const POWERBALL: LotteryGame = {
  id: "powerball",
  name: "Powerball",
  jackpot: 231_000_000,
  jackpotCashValue: 105_000_000,
  lastDraw: "Sat, Apr 4, 2026",
  nextDraw: "Mon, Apr 6, 2026",
  odds: {
    jackpot: 292_201_338,
    anyPrize: 24.87,
  },
  prizeTiers: [
    { match: "JACKPOT", label: "5 numbers + Powerball", prize: "JACKPOT", odds: 292_201_338 },
    { match: "MATCH5", label: "5 numbers", prize: 1_000_000, odds: 11_688_053 },
    { match: "4+PB", label: "4 numbers + Powerball", prize: 50_000, odds: 913_129 },
    { match: "4NUM", label: "4 numbers", prize: 100, odds: 36_525 },
    { match: "3+PB", label: "3 numbers + Powerball", prize: 100, odds: 14_494 },
    { match: "3NUM", label: "3 numbers", prize: 7, odds: 580 },
    { match: "2+PB", label: "2 numbers + Powerball", prize: 7, odds: 701 },
    { match: "1+PB", label: "1 number + Powerball", prize: 4, odds: 92 },
    { match: "PBONLY", label: "Powerball only", prize: 4, odds: 38 },
  ],
  advertisedReturnPct: 63,
};

export const MEGA_MILLIONS: LotteryGame = {
  id: "megamillions",
  name: "Mega Millions",
  jackpot: 100_000_000,
  jackpotCashValue: 44_700_000,
  lastDraw: "Fri, Apr 3, 2026",
  nextDraw: "Tue, Apr 7, 2026",
  odds: {
    jackpot: 302_575_350,
    anyPrize: 24,
  },
  prizeTiers: [
    { match: "JACKPOT", label: "5 numbers + Mega Ball", prize: "JACKPOT", odds: 302_575_350 },
    { match: "MATCH5", label: "5 numbers", prize: 1_000_000, odds: 12_607_306 },
    { match: "4+MB", label: "4 numbers + Mega Ball", prize: 10_000, odds: 931_001 },
    { match: "4NUM", label: "4 numbers", prize: 500, odds: 38_792 },
    { match: "3+MB", label: "3 numbers + Mega Ball", prize: 200, odds: 14_547 },
    { match: "3NUM", label: "3 numbers", prize: 10, odds: 606 },
    { match: "2+MB", label: "2 numbers + Mega Ball", prize: 10, odds: 693 },
    { match: "1+MB", label: "1 number + Mega Ball", prize: 4, odds: 89 },
    { match: "MBONLY", label: "Mega Ball only", prize: 2, odds: 37 },
  ],
  advertisedReturnPct: 58,
};

export const DEFAULT_GAME = POWERBALL;
