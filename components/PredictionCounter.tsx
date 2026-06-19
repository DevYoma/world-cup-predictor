"use client";

import { useQuery } from "@tanstack/react-query";

interface StatsData {
  totalPredictions: number;
}

export default function PredictionCounter() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ["predictions-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) {
        throw new Error("Failed to load predictions stats");
      }
      return res.json();
    },
    refetchInterval: 10000, // Fetch every 10 seconds to update on the fly
  });

  if (isLoading || !data) {
    return (
      <div className="h-10 w-48 bg-zinc-900/20 border border-zinc-800/40 rounded-full animate-pulse mx-auto my-2" />
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-gradient-to-r from-zinc-900/80 to-zinc-950/80 border border-zinc-800/80 rounded-full text-zinc-300 font-medium text-xs tracking-wider shadow-lg backdrop-blur-md transition-all duration-300 hover:border-zinc-700 mx-auto my-2 animate-in fade-in slide-in-from-top-1 duration-300">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <span className="font-extrabold text-amber-500 font-mono tracking-wide text-sm bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
        {data.totalPredictions.toLocaleString()}
      </span>
      <span className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
        Predictions Submitted
      </span>
    </div>
  );
}
