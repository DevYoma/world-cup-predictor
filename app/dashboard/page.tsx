"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Header from "@/components/Header";

interface UserStats {
  totalPoints: number;
  predictionsCount: number;
  rank: number;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
}

interface Team {
  id: number;
  name: string;
  shortName: string;
  flagUrl: string | null;
}

interface Match {
  id: number;
  apiMatchId: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoffAt: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  prediction?: {
    id: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
    pointsAwarded: number | null;
  } | null;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Fetch user dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });

  // 2. Fetch all matches to extract user predictions history
  const { data: matches, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["matches", true],
    queryFn: async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 3. Admin Manual Sync trigger
  const handleAdminSync = async () => {
    setIsSyncing(true);
    setToast({ text: "Syncing fixtures and scores...", isError: false });
    try {
      const res = await fetch("/api/sync/matches", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const result = await res.json();
      setToast({ text: `Sync complete! Synced ${result.count || 0} matches.`, isError: false });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    } catch (err) {
      console.error(err);
      setToast({ text: "Failed to synchronize matches.", isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

  const averagePoints = stats && stats.predictionsCount > 0 
    ? (stats.totalPoints / stats.predictionsCount).toFixed(2) 
    : "0.00";

  // Filter only matches that have predictions
  const predictedMatches = (matches || [])
    .filter((m) => m.prediction !== null && m.prediction !== undefined)
    // Sort latest predicted matches first
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());

  const isAdmin = stats?.email === "lawrenceyoma@gmail.com";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans px-2 py-6 sm:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <Header subtitle="Dashboard Overview" />

        {/* Toast Alert */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-2xl flex items-center justify-between gap-4 min-w-[320px] max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.isError 
              ? "bg-red-950 border-red-900 text-red-200" 
              : "bg-zinc-900 border-zinc-800 text-zinc-50 border-zinc-800"
          }`}>
            <div className="flex items-center gap-3">
              <span className={toast.isError ? "text-red-500 text-lg" : "text-amber-500 text-lg"}>
                {toast.isError ? "⚠️" : "✓"}
              </span>
              <span className="text-sm font-medium leading-relaxed">{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-zinc-300 font-bold p-1 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {statsLoading || matchesLoading ? (
          <div className="text-center py-20 text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Loading dashboard data...
          </div>
        ) : !stats ? (
          <div className="bg-red-950/20 border border-red-900/40 p-6 rounded-2xl text-center text-red-200">
            Failed to load dashboard metrics. Please sign out and sign in again.
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Welcome banner card */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                {stats.avatarUrl ? (
                  <img src={stats.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/30 shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-800 text-amber-500 border-2 border-amber-500/30 flex items-center justify-center text-xl font-bold shadow-lg">
                    {stats.displayName?.substring(0, 2).toUpperCase() || "PT"}
                  </div>
                )}
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-zinc-100">
                    Welcome back, {stats.displayName || "Predictor"}!
                  </h2>
                  <p className="text-zinc-500 text-xs font-semibold mt-1 uppercase tracking-wider">
                    {stats.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {isAdmin && (
                  <button 
                    onClick={handleAdminSync}
                    disabled={isSyncing}
                    className="flex-1 md:flex-initial h-11 px-5 bg-zinc-900 border border-zinc-800 text-amber-500 font-extrabold rounded-xl hover:bg-zinc-850 hover:border-zinc-700 transition-colors flex items-center justify-center text-sm disabled:opacity-40 cursor-pointer"
                  >
                    {isSyncing ? "Syncing..." : "🔄 Sync Matches"}
                  </button>
                )}
                <Link href="/matches" className="flex-1 md:flex-initial h-11 px-6 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center text-sm shadow">
                  Predict Matches
                </Link>
                <Link href="/leaderboard" className="flex-1 md:flex-initial h-11 px-6 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-850 transition-colors flex items-center justify-center text-sm">
                  Leaderboard
                </Link>
              </div>
            </div>

            {/* Performance aggregates cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Stat card 1: Rank */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex flex-col hover:border-zinc-700/40 transition-colors duration-300 shadow-lg relative overflow-hidden">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Global Standings</span>
                <span className="text-3xl font-black text-amber-500 mt-2 block">
                  #{stats.rank}
                </span>
                <span className="text-xs text-zinc-500 font-semibold mt-2">
                  Top of the leaderboard
                </span>
                <div className="absolute right-4 bottom-4 text-4xl opacity-[0.03]">🌍</div>
              </div>

              {/* Stat card 2: Points */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex flex-col hover:border-zinc-700/40 transition-colors duration-300 shadow-lg relative overflow-hidden">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Total Points</span>
                <span className="text-3xl font-black text-amber-500 mt-2 block">
                  {stats.totalPoints} <span className="text-sm font-bold text-zinc-400">pts</span>
                </span>
                <span className="text-xs text-zinc-500 font-semibold mt-2">
                  From predicted matches
                </span>
                <div className="absolute right-4 bottom-4 text-4xl opacity-[0.03]">🏆</div>
              </div>

              {/* Stat card 3: Efficiency */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex flex-col hover:border-zinc-700/40 transition-colors duration-300 shadow-lg relative overflow-hidden">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Accuracy (Avg)</span>
                <span className="text-3xl font-black text-zinc-100 mt-2 block">
                  {averagePoints} <span className="text-sm font-bold text-zinc-400">pts/game</span>
                </span>
                <span className="text-xs text-zinc-500 font-semibold mt-2">
                  Across {stats.predictionsCount} match predictions
                </span>
                <div className="absolute right-4 bottom-4 text-4xl opacity-[0.03]">📈</div>
              </div>

            </div>

            {/* Quick Tips & Info section (Moved Up) */}
            <section className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl p-6 text-zinc-400 text-sm leading-relaxed shadow">
              <h3 className="font-extrabold text-zinc-300 mb-2.5 uppercase text-xs tracking-wider text-amber-500/90">Tournament Scoring System</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
                <li><strong className="text-amber-500">5 points</strong>: Exact Score predicted correctly (e.g. predicted 2-1, final score 2-1).</li>
                <li><strong className="text-amber-500">2 points</strong>: Correct match outcome (Win/Draw/Loss) predicted correctly, but score is not exact.</li>
                <li><strong className="text-zinc-600">0 points</strong>: Incorrect prediction.</li>
                <li>Match predictions lock automatically exactly at kickoff.</li>
              </ul>
            </section>

            {/* Prediction History Section (Consolidated scrollable box) */}
            <div className="bg-zinc-900/30 border border-zinc-800/70 rounded-3xl p-6 shadow-inner space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-500/80">
                  Your Predictions History
                </h3>
                {predictedMatches.length > 0 && (
                  <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest animate-pulse hidden sm:inline">
                    ↕ Scroll to view all
                  </span>
                )}
              </div>

              {predictedMatches.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <p className="text-sm">You haven't predicted any matches yet.</p>
                  <Link href="/matches" className="text-amber-500 hover:underline text-xs font-bold mt-2 inline-block">
                    Start Predicting Now →
                  </Link>
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto pr-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {predictedMatches.map((match) => {
                    const isFinished = match.status === "finished";
                    const isLive = match.status === "live";
                    const hasResult = match.homeScore !== null && match.awayScore !== null;
                    const pts = match.prediction?.pointsAwarded;

                    return (
                      <div 
                        key={match.id} 
                        className="bg-zinc-950/45 border border-zinc-900/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-zinc-800 transition-colors"
                      >
                        {/* Left: Kickoff Details & Match status */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="min-w-[90px]">
                            <span className="text-zinc-500 text-[10px] font-bold block">
                              {new Date(match.kickoffAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="text-zinc-400 text-xs font-black block uppercase tracking-wider">
                              {new Date(match.kickoffAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isLive ? (
                              <span className="bg-red-950/80 text-red-500 border border-red-900/40 px-2 py-0.5 rounded text-[9px] uppercase font-black animate-pulse">Live</span>
                            ) : isFinished ? (
                              <span className="bg-zinc-800 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded text-[9px] uppercase font-black">FT</span>
                            ) : (
                              <span className="bg-zinc-900 text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded text-[9px] uppercase font-black">Upcoming</span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Match Scoreboard */}
                        <div className="flex items-center gap-4 flex-1 justify-center w-full">
                          {/* Home */}
                          <div className="flex items-center gap-2 w-5/12 justify-end">
                            <span className="font-bold text-zinc-300 text-xs truncate max-w-[80px]">
                              {match.homeTeam?.shortName || "TBD"}
                            </span>
                            {match.homeTeam?.flagUrl && (
                              <img src={match.homeTeam.flagUrl} alt="flag" className="w-6 h-4 object-cover rounded border border-zinc-800" />
                            )}
                          </div>

                          {/* Scores Display */}
                          <div className="bg-zinc-900/90 px-3 py-1 rounded-xl border border-zinc-800 text-xs font-black tracking-widest text-zinc-200">
                            {hasResult ? `${match.homeScore} - ${match.awayScore}` : "VS"}
                          </div>

                          {/* Away */}
                          <div className="flex items-center gap-2 w-5/12 justify-start">
                            {match.awayTeam?.flagUrl && (
                              <img src={match.awayTeam.flagUrl} alt="flag" className="w-6 h-4 object-cover rounded border border-zinc-800" />
                            )}
                            <span className="font-bold text-zinc-300 text-xs truncate max-w-[80px]">
                              {match.awayTeam?.shortName || "TBD"}
                            </span>
                          </div>
                        </div>

                        {/* Right: Prediction Details & Points */}
                        <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-4 border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block">Predicted</span>
                            <span className="text-sm font-extrabold text-amber-500">
                              {match.prediction?.predictedHomeScore} - {match.prediction?.predictedAwayScore}
                            </span>
                          </div>

                          <div>
                            {isFinished ? (
                              pts === 5 ? (
                                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide block">
                                  🌟 +5 pts
                                </span>
                              ) : pts === 2 ? (
                                <span className="bg-amber-950/80 text-amber-400 border border-amber-900/40 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide block">
                                  ✓ +2 pts
                                </span>
                              ) : (
                                <span className="bg-zinc-950 text-zinc-500 border border-zinc-800 px-2.5 py-1 rounded-xl text-[10px] font-bold block">
                                  0 pts
                                </span>
                              )
                            ) : (
                              <span className="bg-zinc-900 text-zinc-600 border border-zinc-800 px-2.5 py-1 rounded-xl text-[10px] font-semibold block">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
