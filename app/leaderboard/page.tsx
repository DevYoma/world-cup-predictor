"use client";

import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";

interface LeaderboardUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  predictionsCount: number;
}

interface LeaderboardResponse {
  currentUserId: string | null;
  rankings: LeaderboardUser[];
}

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const rankings = data?.rankings || [];
  const currentUserId = data?.currentUserId;

  // Find current user's position and details (if signed in)
  const currentUserIndex = rankings.findIndex((r) => r.id === currentUserId);
  const currentUserRanking = currentUserIndex !== -1 ? rankings[currentUserIndex] : null;
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-8 pb-28">
      <div className="max-w-4xl mx-auto">
        <Header subtitle="Global Leaderboard" />

        {isLoading ? (
          <div className="text-center py-24 text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Loading standings...
          </div>
        ) : rankings.length === 0 ? (
          /* Empty State */
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto mt-12 shadow-2xl">
            <div className="text-5xl mb-6">🏆</div>
            <h3 className="text-xl font-bold text-amber-500 mb-2">Standings Will Appear Here</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              No predictions have been scored yet. Start predicting upcoming matches! Rankings will calculate automatically once the tournament kicks off and final results are synchronized.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-6 animate-in fade-in duration-300">
            
            {/* Rankings List (Horizontal Rectangles) */}
            <div className="space-y-3">
              {rankings.map((player, idx) => {
                const rank = idx + 1;
                const isCurrentUser = player.id === currentUserId;
                const avgPts = player.predictionsCount > 0 
                  ? (player.totalPoints / player.predictionsCount).toFixed(1)
                  : "0.0";

                // Rank style colors/badges for Top 3
                let rankBadge = (
                  <span className="font-black text-sm text-zinc-500 min-w-[28px] text-center block">
                    {rank}
                  </span>
                );
                if (rank === 1) {
                  rankBadge = (
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-black h-7 w-7 rounded-full flex items-center justify-center shadow-sm">
                      1
                    </span>
                  );
                } else if (rank === 2) {
                  rankBadge = (
                    <span className="bg-zinc-400/10 text-zinc-300 border border-zinc-400/20 text-xs font-black h-7 w-7 rounded-full flex items-center justify-center shadow-sm">
                      2
                    </span>
                  );
                } else if (rank === 3) {
                  rankBadge = (
                    <span className="bg-amber-800/10 text-amber-600 border border-amber-800/20 text-xs font-black h-7 w-7 rounded-full flex items-center justify-center shadow-sm">
                      3
                    </span>
                  );
                }

                return (
                  <div 
                    key={player.id} 
                    className={`bg-zinc-900/40 border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-zinc-700/50 ${
                      isCurrentUser 
                        ? "border-amber-500/40 bg-amber-500/5" 
                        : "border-zinc-800/80"
                    }`}
                  >
                    {/* Left Rank & User Info Block */}
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      {rankBadge}

                      {/* User Avatar & Name */}
                      <div className="flex items-center gap-3">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-zinc-800 object-cover shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-800 flex items-center justify-center text-sm font-black shadow-sm">
                            {player.displayName?.substring(0, 2).toUpperCase() || "PT"}
                          </div>
                        )}
                        <div>
                          <h3 className={`text-sm md:text-base font-bold flex items-center ${isCurrentUser ? "text-amber-500" : "text-zinc-300"}`}>
                            {player.displayName || "Anonymous Predictor"}
                            {isCurrentUser && (
                              <span className="text-[9px] uppercase font-black tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded ml-2">
                                You
                              </span>
                            )}
                          </h3>
                          <span className="text-[11px] text-zinc-500 font-semibold block mt-0.5">
                            Avg: {avgPts} pts • {player.predictionsCount} predictions
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Points Block */}
                    <div className="text-right">
                      <span className="text-base md:text-lg font-black text-amber-500">
                        {player.totalPoints} <span className="text-xs font-bold text-zinc-400">pts</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Current User Standing Summary (at bottom of view if outside Top 3) */}
            {currentUserRanking && currentUserRank && currentUserRank > 3 && (
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/90 backdrop-blur-md border-t border-amber-500/30 py-4 px-6 shadow-2xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="bg-amber-500 text-black text-sm font-black h-8 px-3.5 rounded-xl flex items-center justify-center shadow">
                      #{currentUserRank}
                    </span>
                    <div className="flex items-center gap-2.5">
                      {currentUserRanking.avatarUrl ? (
                        <img src={currentUserRanking.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold">
                          {currentUserRanking.displayName?.substring(0, 2).toUpperCase() || "PT"}
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-sm text-zinc-300">
                          {currentUserRanking.displayName || "Anonymous Predictor"}
                        </h4>
                        <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Your Standing</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Predicted</span>
                      <span className="text-sm font-extrabold text-zinc-300">{currentUserRanking.predictionsCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Avg Score</span>
                      <span className="text-sm font-extrabold text-zinc-300">
                        {currentUserRanking.predictionsCount > 0 
                          ? (currentUserRanking.totalPoints / currentUserRanking.predictionsCount).toFixed(1)
                          : "0.0"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Points</span>
                      <span className="text-base font-black text-amber-500">{currentUserRanking.totalPoints} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
