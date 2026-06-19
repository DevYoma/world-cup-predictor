"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";

interface League {
  id: string;
  name: string;
  code: string;
  creatorId: string;
  createdAt: string;
}

interface Member {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  predictionsCount: number;
  joinedAt: string;
}

interface LeaderboardData {
  league: League;
  currentUserId: string;
  members: Member[];
}

export default function LeagueLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { data, isLoading, isError } = useQuery<LeaderboardData>({
    queryKey: ["league-leaderboard", id],
    queryFn: async () => {
      const res = await fetch(`/api/leagues/${id}/leaderboard`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load leaderboard");
      }
      return res.json();
    },
    enabled: !!id,
  });

  const handleCopyCode = () => {
    if (!data?.league.code) return;
    navigator.clipboard.writeText(data.league.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteLeague = async () => {
    if (!data || confirmName !== data.league.name) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete league");
      }
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      setIsDeleteModalOpen(false);
      router.push("/leagues");
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans px-2 py-6 sm:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <Header subtitle="Private League" />

        {isLoading ? (
          <div className="text-center py-20 text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Loading leaderboard...
          </div>
        ) : isError || !data ? (
          <div className="bg-red-950/20 border border-red-900/40 p-8 rounded-2xl text-center space-y-3">
            <p className="text-red-400 font-bold">Could not load this league.</p>
            <p className="text-red-500/60 text-sm">You may not be a member or the league doesn't exist.</p>
            <button
              onClick={() => router.push("/leagues")}
              className="mt-2 h-10 px-5 bg-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-700 transition-colors text-sm cursor-pointer"
            >
              ← Back to Leagues
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* League Hero Card */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <button
                    onClick={() => router.push("/leagues")}
                    className="text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    ← All Leagues
                  </button>
                  <h2 className="text-2xl md:text-3xl font-black text-zinc-100">{data.league.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Invite Code</span>
                    <span className="font-mono font-black text-amber-500 tracking-widest text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                      {data.league.code}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleCopyCode}
                    className={`h-11 px-6 font-extrabold rounded-xl text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer shadow ${
                      copied
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                    }`}
                  >
                    {copied ? "✓ Copied!" : "📋 Copy Code"}
                  </button>

                  {data.league.creatorId === data.currentUserId && (
                    <button
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="h-11 px-6 font-extrabold rounded-xl text-sm transition-all duration-200 bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900/40 hover:border-red-500/55 hover:text-red-300 cursor-pointer shadow flex items-center gap-2"
                    >
                      🗑️ Delete League
                    </button>
                  )}
                </div>
              </div>

              <p className="text-zinc-600 text-xs mt-4">
                Share the code <span className="font-mono font-bold text-zinc-500">{data.league.code}</span> with friends. They can join via the Leagues page → "Enter Code".
              </p>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-red-500">Delete Private League</h3>
                    <p className="text-zinc-400 text-sm">
                      Are you absolutely sure you want to delete <span className="font-bold text-zinc-200">"{data.league.name}"</span>?
                    </p>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      This action is irreversible. All leaderboard stats and member associations for this league will be permanently deleted.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-400">
                      Type the league name to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={data.league.name}
                      className="w-full h-11 bg-zinc-950 border border-zinc-850 rounded-xl px-4 text-sm font-medium text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition-colors"
                      disabled={isDeleting}
                    />
                    {deleteError && (
                      <p className="text-red-400 text-xs font-semibold">{deleteError}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setConfirmName("");
                        setDeleteError("");
                      }}
                      className="flex-1 h-11 bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold rounded-xl text-sm hover:bg-zinc-700 transition-colors cursor-pointer"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteLeague}
                      disabled={confirmName !== data.league.name || isDeleting}
                      className="flex-1 h-11 bg-red-600 hover:bg-red-550 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border disabled:border-zinc-800 font-black rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-zinc-900/30 border border-zinc-800/70 rounded-3xl overflow-hidden shadow-inner">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-500/80">
                  Rankings — {data.members.length} {data.members.length === 1 ? "member" : "members"}
                </h3>
              </div>

              {data.members.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">No members yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {data.members.map((member, index) => {
                    const rank = index + 1;
                    const avg = member.predictionsCount > 0
                      ? (member.totalPoints / member.predictionsCount).toFixed(2)
                      : "0.00";
                    const isMe = member.id === data.currentUserId;

                    return (
                      <div
                        key={member.id}
                        className={`px-6 py-4 flex items-center gap-4 transition-colors ${
                          isMe ? "bg-amber-500/5 border-l-2 border-amber-500/40" : "hover:bg-zinc-900/40"
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-8 text-center flex-shrink-0">
                          {rank === 1 ? (
                            <span className="text-xl">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-xl">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-xl">🥉</span>
                          ) : (
                            <span className="text-sm font-black text-zinc-500">#{rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt="avatar"
                            className="w-9 h-9 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-black text-amber-500 flex-shrink-0">
                            {member.displayName?.substring(0, 2).toUpperCase() || "??"}
                          </div>
                        )}

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${isMe ? "text-amber-400" : "text-zinc-200"}`}>
                            {member.displayName || "Anonymous"}
                            {isMe && <span className="ml-2 text-[10px] font-black text-amber-500/70 uppercase tracking-wider">You</span>}
                          </p>
                          <p className="text-zinc-500 text-xs">{member.predictionsCount} predictions</p>
                        </div>

                        {/* Stats */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-amber-500 text-sm">{member.totalPoints} <span className="text-xs font-bold text-zinc-500">pts</span></p>
                          <p className="text-zinc-500 text-xs">{avg} avg</p>
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
