"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@clerk/nextjs";

interface League {
  id: string;
  name: string;
  code: string;
  creatorId: string;
  creatorName: string | null;
  createdAt: string;
}

export default function LeaguesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [leagueName, setLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const showToast = (text: string, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch user's leagues
  const { data: myLeagues = [], isLoading } = useQuery<League[]>({
    queryKey: ["leagues"],
    queryFn: async () => {
      const res = await fetch("/api/leagues");
      if (!res.ok) throw new Error("Failed to fetch leagues");
      return res.json();
    },
  });

  // Create league mutation
  const createLeague = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create league");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      setShowCreate(false);
      setLeagueName("");
      showToast(`League "${data.league.name}" created! Code: ${data.league.code}`);
      router.push(`/leagues/${data.league.id}`);
    },
    onError: (err: Error) => showToast(err.message, true),
  });

  // Join league mutation
  const joinLeague = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join league");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      setShowJoin(false);
      setInviteCode("");
      const msg = data.status === "already_member" ? "You're already in this league!" : `Joined "${data.league.name}"!`;
      showToast(msg);
      router.push(`/leagues/${data.league.id}`);
    },
    onError: (err: Error) => showToast(err.message, true),
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans px-2 py-6 sm:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <Header subtitle="Private Leagues" />

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-2xl flex items-center justify-between gap-4 min-w-[320px] max-w-sm animate-in fade-in slide-in-from-bottom-5 ${
            toast.isError ? "bg-red-950 border-red-900 text-red-200" : "bg-zinc-900 border-zinc-800 text-zinc-50"
          }`}>
            <div className="flex items-center gap-3">
              <span className={toast.isError ? "text-red-500 text-lg" : "text-amber-500 text-lg"}>
                {toast.isError ? "⚠️" : "✓"}
              </span>
              <span className="text-sm font-medium leading-relaxed">{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-zinc-300 font-bold p-1 cursor-pointer">✕</button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-zinc-100">Private Leagues</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Compete with friends using your real prediction points.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
              className="h-11 px-5 bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:border-zinc-600 hover:text-zinc-100 transition-all text-sm cursor-pointer"
            >
              Enter Code
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); }}
              className="h-11 px-5 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition-colors text-sm shadow cursor-pointer"
            >
              + Create League
            </button>
          </div>
        </div>

        {/* Create League Modal */}
        {showCreate && (
          <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl">
            <h3 className="font-black text-amber-500 uppercase tracking-wide text-sm">Create a New League</h3>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">League Name</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && leagueName.trim() && createLeague.mutate(leagueName)}
                placeholder="e.g. The Office Banter League"
                maxLength={50}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 transition-colors"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowCreate(false); setLeagueName(""); }}
                className="h-10 px-5 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => leagueName.trim() && createLeague.mutate(leagueName)}
                disabled={!leagueName.trim() || createLeague.isPending}
                className="h-10 px-6 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {createLeague.isPending ? "Creating..." : "Create League"}
              </button>
            </div>
          </div>
        )}

        {/* Join League Modal */}
        {showJoin && (
          <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl">
            <h3 className="font-black text-amber-500 uppercase tracking-wide text-sm">Join a League</h3>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && inviteCode.trim() && joinLeague.mutate(inviteCode)}
                placeholder="e.g. WC-A7B8"
                maxLength={8}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 transition-colors font-mono tracking-widest uppercase"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowJoin(false); setInviteCode(""); }}
                className="h-10 px-5 bg-zinc-800 text-zinc-400 font-semibold rounded-xl hover:bg-zinc-700 transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => inviteCode.trim() && joinLeague.mutate(inviteCode)}
                disabled={!inviteCode.trim() || joinLeague.isPending}
                className="h-10 px-6 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {joinLeague.isPending ? "Joining..." : "Join League"}
              </button>
            </div>
          </div>
        )}

        {/* Leagues List */}
        {isLoading ? (
          <div className="text-center py-20 text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Loading leagues...
          </div>
        ) : myLeagues.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/70 rounded-3xl p-12 text-center space-y-4">
            <div className="text-5xl">🏆</div>
            <h3 className="text-lg font-black text-zinc-300">No leagues yet</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              Create a private league and share the code with your friends to compete together.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
             {myLeagues.map((league) => {
               const isMe = league.creatorId === userId;
               const creatorDisplayName = isMe ? "You" : (league.creatorName || "Anonymous");
               return (
                 <button
                   key={league.id}
                   onClick={() => router.push(`/leagues/${league.id}`)}
                   className="w-full text-left bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-200 group cursor-pointer"
                 >
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-lg">
                       🏅
                     </div>
                     <div>
                       <p className="font-black text-zinc-100 text-sm group-hover:text-amber-400 transition-colors flex flex-wrap items-center gap-x-2">
                         <span>{league.name}</span>
                         <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                           by {creatorDisplayName}
                         </span>
                       </p>
                       <p className="text-zinc-500 text-xs font-mono font-bold mt-0.5 tracking-widest">{league.code}</p>
                     </div>
                   </div>
                   <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-lg">→</span>
                 </button>
               );
             })}
          </div>
        )}
      </div>
    </div>
  );
}
