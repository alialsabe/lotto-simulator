import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { type SimResult } from "@/lib/simulation";

export function MonteCarloResults({ sim }: { sim: SimResult }) {
  // Use a simpler approach: bar chart that shows the distribution of outcomes
  const chartData = [
    { name: "Worst", value: sim.worstLoss },
    { name: "Median", value: sim.medianLoss },
    { name: "Best", value: sim.bestOutcome },
  ];

  return (
    <section className="max-w-xl mx-auto px-6 mb-12">
      <div className="bg-[#0f0a1e]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#7c3aed]/40">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-[#7c3aed]">
              {sim.params.trials.toLocaleString()} Players Simulated
            </h2>
          </div>
        </div>

        <div className="mb-6 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#6b6b8a" />
              <YAxis stroke="#6b6b8a" />
              <Tooltip cursor={{fill: '#1e1535'}} contentStyle={{backgroundColor: '#030014'}} />
              <Bar dataKey="value" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#00d4ff]">
              {sim.prizes.find((p) => p.tier === "MATCH5")?.wins || 0}
            </div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">2nd Prize Wins</div>
          </div>
          <div className="bg-[#030014] rounded-xl p-3 border border-[#1e1535] text-center">
            <div className="font-mono font-black text-[#ffd700]">
              {sim.jackpotWins}
            </div>
            <div className="text-xs text-[#6b6b8a] mt-0.5">Jackpot Wins</div>
          </div>
        </div>
      </div>
    </section>
  );
}
