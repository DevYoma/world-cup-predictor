"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Header from "./Header";

interface Team {
  id: number;
  name: string;
  shortName: string;
  flagUrl: string | null;
  groupName: string | null;
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
    lockedAt: string | null;
  } | null;
}

function calculatePoints(homeScore: number | null, awayScore: number | null, predHome: number, predAway: number): number {
  if (homeScore === null || awayScore === null) return 0;
  if (homeScore === predHome && awayScore === predAway) return 5;
  const actualDiff = homeScore - awayScore;
  const predDiff = predHome - predAway;
  if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
    return 2;
  }
  return 0;
}

export default function MatchList() {
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  // Active view tab: "open" for upcoming predictions, "results" for live/finished matches
  const [activeTab, setActiveTab] = useState<"open" | "results">("open");

  // Local state for score input inputs: Record<matchId, { home, away }>
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({});
  // Local state for anonymous predictions stored in localStorage
  const [localPreds, setLocalPreds] = useState<Record<number, { homeScore: number; awayScore: number }>>({});
  // Floating Toast Alert message state
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Edit Modal States
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editHomeScore, setEditHomeScore] = useState<string>("");
  const [editAwayScore, setEditAwayScore] = useState<string>("");

  // 1. Fetch matches from Elysia
  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["matches", isSignedIn],
    queryFn: async () => {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  // Load local predictions on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wc_anonymous_predictions");
      if (saved) {
        try {
          setLocalPreds(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse local predictions", e);
        }
      }
    }
  }, []);

  // Auto-dismiss floating Toast alert after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 2. Sync local predictions to DB once signed in
  useEffect(() => {
    if (isLoaded && isSignedIn && Object.keys(localPreds).length > 0) {
      const syncLocalPredictions = async () => {
        console.log("Syncing local predictions to account...");
        let syncedCount = 0;
        
        for (const [matchIdStr, pred] of Object.entries(localPreds)) {
          const matchId = parseInt(matchIdStr, 10);
          try {
            const res = await fetch("/api/predictions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                matchId,
                homeScore: pred.homeScore,
                awayScore: pred.awayScore,
              }),
            });
            if (res.ok) syncedCount++;
          } catch (e) {
            console.error(`Failed to sync prediction for match ${matchId}`, e);
          }
        }

        if (syncedCount > 0) {
          setMessage({ text: `Successfully synced ${syncedCount} local prediction(s) to your account!`, isError: false });
          // Clear localStorage once synced
          localStorage.removeItem("wc_anonymous_predictions");
          setLocalPreds({});
          queryClient.invalidateQueries({ queryKey: ["matches"] });
        }
      };

      syncLocalPredictions();
    }
  }, [isLoaded, isSignedIn, localPreds, queryClient]);

  // 3. Save prediction mutation
  const savePrediction = useMutation({
    mutationFn: async (payload: { matchId: number; homeScore: number; awayScore: number }) => {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save prediction");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage({ text: "Prediction saved successfully!", isError: false });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error: any) => {
      setMessage({ text: error.message || "Failed to save prediction", isError: true });
    },
  });

  const handleScoreChange = (matchId: number, side: "home" | "away", value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: cleaned,
      },
    }));
  };

  // Generic Save Logic
  const handleSavePrediction = (match: Match, homeVal: string, awayVal: string) => {
    if (homeVal === undefined || awayVal === undefined || homeVal === "" || awayVal === "") {
      setMessage({ text: "Please enter scores for both teams", isError: true });
      return;
    }

    const homeScore = parseInt(homeVal.toString(), 10);
    const awayScore = parseInt(awayVal.toString(), 10);

    // Validate Kickoff Lock
    if (new Date(match.kickoffAt) <= new Date()) {
      setMessage({ text: "This match has already started. Prediction locked!", isError: true });
      return;
    }

    if (isSignedIn) {
      // Authenticated Save
      savePrediction.mutate({ matchId: match.id, homeScore, awayScore });
    } else {
      // Anonymous Save
      const updated = { ...localPreds };
      
      // Find the IDs of the next 3 upcoming matches chronologically
      const nextThreeMatchIds = (matches || [])
        .filter((m) => new Date(m.kickoffAt) > new Date())
        .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
        .slice(0, 3)
        .map(m => m.id);

      // Verify if the match is one of the next 3 upcoming, or if they already predicted it
      const isThisPredicted = updated[match.id] !== undefined;
      if (!nextThreeMatchIds.includes(match.id) && !isThisPredicted) {
        setMessage({ 
          text: "Anonymous predictions are only allowed for the next 3 upcoming matches. Please sign in to predict more matches!", 
          isError: true 
        });
        return;
      }

      updated[match.id] = { homeScore, awayScore };
      localStorage.setItem("wc_anonymous_predictions", JSON.stringify(updated));
      setLocalPreds(updated);
      setMessage({ text: "Prediction saved locally in browser! Sign in to save permanently.", isError: false });
    }
  };

  // Inline Prediction Save
  const handleInlineSave = (match: Match) => {
    const entered = scores[match.id];
    handleSavePrediction(match, entered?.home || "", entered?.away || "");
  };

  // Modal Update Save
  const handleModalSave = () => {
    if (!editingMatch) return;
    handleSavePrediction(editingMatch, editHomeScore, editAwayScore);
    setEditingMatch(null);
  };

  // Open Edit Modal
  const openEditModal = (match: Match, homeScoreVal: number, awayScoreVal: number) => {
    setEditingMatch(match);
    setEditHomeScore(homeScoreVal.toString());
    setEditAwayScore(awayScoreVal.toString());
  };

  if (isLoading) {
    return <div className="text-center py-12 text-zinc-400">Loading fixtures...</div>;
  }

  // --- Filter and Sort matches based on the active tab ---
  const now = new Date();
  const filteredMatches = (matches || []).filter((match) => {
    const isPast = new Date(match.kickoffAt) <= now;
    return activeTab === "open" ? !isPast : isPast;
  });

  // Sort Open predictions soonest first (ascending), Results latest first (descending)
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    const timeA = new Date(a.kickoffAt).getTime();
    const timeB = new Date(b.kickoffAt).getTime();
    return activeTab === "open" ? timeA - timeB : timeB - timeA;
  });

  // Group matches by kickoff date string
  const groupedMatches: Record<string, Match[]> = {};
  sortedMatches.forEach((match) => {
    const dateLabel = new Date(match.kickoffAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groupedMatches[dateLabel]) {
      groupedMatches[dateLabel] = [];
    }
    groupedMatches[dateLabel].push(match);
  });

  // Find the IDs of the next 3 upcoming matches chronologically
  const nextThreeMatchIds = (matches || [])
    .filter((m) => new Date(m.kickoffAt) > now)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .slice(0, 3)
    .map(m => m.id);

  // Check how many matches the anonymous user has predicted
  const usedCount = Object.keys(localPreds).length;

  return (
    <div className="max-w-4xl mx-auto px-0 pb-24">
      {/* Navigation Header */}
      <Header subtitle="Match Predictions" />

      {/* Floating Toast Alert Container */}
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-2xl flex items-center justify-between gap-4 min-w-[320px] max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
          message.isError 
            ? "bg-red-950 border-red-900 text-red-200" 
            : "bg-zinc-900 border-zinc-800 text-zinc-50"
        }`}>
          <div className="flex items-center gap-3">
            {message.isError ? (
              <span className="text-red-500 text-lg">⚠️</span>
            ) : (
              <span className="text-amber-500 text-lg">✓</span>
            )}
            <span className="text-sm font-medium leading-relaxed">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-zinc-500 hover:text-zinc-300 font-bold p-1 transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Anonymous limit banner (always at top) */}
      {!isSignedIn && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-amber-500">Predicting Anonymously</h3>
            <p className="text-zinc-400 text-sm mt-1">
              You can predict the next 3 upcoming matches of the tournament before signing in ({usedCount}/3 predicted).
            </p>
            <p className="text-zinc-500 text-xs mt-2">
              Already have an account? <Link href="/sign-in" className="text-amber-500 hover:underline">Sign In</Link> to view your predicted matches and score points.
            </p>
          </div>
          <Link href="/sign-up" className="bg-amber-500 text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-400 transition-colors whitespace-nowrap">
            Create Account
          </Link>
        </div>
      )}

      {/* Status Tabs Navigation */}
      <div className="flex border-b border-zinc-800 mb-8 gap-4">
        <button
          onClick={() => setActiveTab("open")}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "open"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Open Predictions ({activeTab === "open" ? sortedMatches.length : (matches || []).filter(m => new Date(m.kickoffAt) > now).length})
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "results"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Results & Live ({activeTab === "results" ? sortedMatches.length : (matches || []).filter(m => new Date(m.kickoffAt) <= now).length})
        </button>
      </div>

      {/* Matches Grouped by Date */}
      <div className="space-y-10">
        {Object.keys(groupedMatches).length > 0 ? (
          Object.entries(groupedMatches).map(([dateLabel, dayMatches]) => (
            <div key={dateLabel} className="space-y-4">
              {/* Daily Header */}
              <h2 className="text-sm font-black text-amber-550/80 uppercase tracking-widest pl-1">
                {dateLabel}
              </h2>
              
              <div className="space-y-4">
                {dayMatches.map((match) => {
                  const isLocked = new Date(match.kickoffAt) <= now;
                  
                  // Get saved predictions
                  const savedHome = isSignedIn 
                    ? match.prediction?.predictedHomeScore 
                    : localPreds[match.id]?.homeScore;
                  const savedAway = isSignedIn 
                    ? match.prediction?.predictedAwayScore 
                    : localPreds[match.id]?.awayScore;

                  const hasSavedPred = savedHome !== undefined && savedAway !== undefined;

                  // Anonymous limit validations: only allow predicting the next 3 upcoming matches
                  const isThisPredicted = localPreds[match.id] !== undefined;
                  const isDemoMatch = nextThreeMatchIds.includes(match.id) || isThisPredicted;
                  const isLockLimitReached = !isSignedIn && !isDemoMatch;
                  const isTBD = !match.homeTeam || !match.awayTeam;

                  if (isLocked) {
                    const actualHome = match.homeScore;
                    const actualAway = match.awayScore;
                    const hasResult = actualHome !== null && actualAway !== null;

                    let ptsAwarded: number | null = null;
                    let ptsLabel = "";
                    let isProjected = false;

                    if (hasSavedPred) {
                      if (isSignedIn && match.prediction?.pointsAwarded !== null && match.prediction?.pointsAwarded !== undefined) {
                        ptsAwarded = match.prediction.pointsAwarded;
                        isProjected = false;
                      } else if (hasResult) {
                        ptsAwarded = calculatePoints(actualHome, actualAway, savedHome, savedAway);
                        isProjected = match.status === "live" || match.prediction?.pointsAwarded === null;
                      }
                    }

                    if (ptsAwarded === 5) {
                      ptsLabel = isProjected ? "+5 pts (Projected)" : "+5 pts (Exact Score)";
                    } else if (ptsAwarded === 2) {
                      ptsLabel = isProjected ? "+2 pts (Projected)" : "+2 pts (Correct Outcome)";
                    } else if (ptsAwarded === 0) {
                      ptsLabel = isProjected ? "0 pts (Projected)" : "0 pts (Incorrect)";
                    }

                    return (
                      <div key={match.id} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 hover:border-zinc-700/50 transition-all duration-300">
                        
                        {/* Match Time & Status Info */}
                        <div className="flex md:flex-col items-center md:items-start justify-between md:justify-center w-full md:w-auto md:min-w-[120px] gap-2 border-b md:border-b-0 border-zinc-800/50 pb-3 md:pb-0">
                          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">
                            {new Date(match.kickoffAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {match.status === "live" ? (
                              <span className="bg-red-950/80 text-red-500 border border-red-900/50 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider animate-pulse flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Live
                              </span>
                            ) : match.status === "finished" ? (
                              <span className="bg-zinc-850 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">
                                FT
                              </span>
                            ) : (
                              <span className="bg-zinc-950 text-zinc-500 border border-zinc-900 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">
                                Locked
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Match Scoreboard Display */}
                        <div className="flex items-center gap-4 justify-between md:justify-center flex-1 w-full">
                          
                          {/* Home Team */}
                          <div className="flex items-center gap-3 w-5/12 justify-end">
                            <span className="font-bold text-zinc-200 text-right text-sm md:text-base truncate max-w-[125px] md:max-w-none">
                              {match.homeTeam ? match.homeTeam.shortName : "TBD"}
                            </span>
                            {match.homeTeam?.flagUrl && (
                              <img src={match.homeTeam.flagUrl} alt="flag" className="w-8 h-5 object-cover rounded border border-zinc-800 shadow-sm" />
                            )}
                          </div>

                          {/* Central Score Display */}
                          <div className="flex flex-col items-center justify-center min-w-[75px] md:min-w-[95px]">
                            <span className="text-xl md:text-2xl font-black bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-1.5 text-zinc-100 tracking-wider">
                              {hasResult ? `${actualHome} - ${actualAway}` : "v"}
                            </span>
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center gap-3 w-5/12 justify-start">
                            {match.awayTeam?.flagUrl && (
                              <img src={match.awayTeam.flagUrl} alt="flag" className="w-8 h-5 object-cover rounded border border-zinc-800 shadow-sm" />
                            )}
                            <span className="font-bold text-zinc-200 text-left text-sm md:text-base truncate max-w-[125px] md:max-w-none">
                              {match.awayTeam ? match.awayTeam.shortName : "TBD"}
                            </span>
                          </div>

                        </div>

                        {/* Prediction Outcome Block */}
                        <div className="w-full md:w-auto flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end gap-3 min-w-[180px] bg-zinc-950/40 border border-zinc-850/60 rounded-xl p-3 md:p-0 md:bg-transparent md:border-0">
                          {hasSavedPred ? (
                            <>
                              <div className="flex flex-col md:items-end">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Your Prediction</span>
                                <span className="text-sm font-extrabold text-zinc-300 mt-0.5">
                                  {savedHome} - {savedAway}
                                </span>
                              </div>
                              <div className="flex md:justify-end">
                                {ptsAwarded === 5 ? (
                                  <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 px-3 py-1 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm shadow-emerald-950/30">
                                    🌟 {ptsLabel}
                                  </span>
                                ) : ptsAwarded === 2 ? (
                                  <span className="bg-amber-950/80 text-amber-400 border border-amber-900/40 px-3 py-1 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm shadow-amber-950/30">
                                    ✓ {ptsLabel}
                                  </span>
                                ) : (
                                  <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 px-3 py-1 rounded-xl text-xs font-bold tracking-wide">
                                    {ptsLabel}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-col md:items-end">
                                <span className="text-[10px] uppercase font-bold text-zinc-550 tracking-wider">Your Prediction</span>
                                <span className="text-sm font-semibold text-zinc-600 mt-0.5">No prediction</span>
                              </div>
                              <div className="flex md:justify-end">
                                <span className="bg-zinc-900 text-zinc-650 border border-zinc-800 px-3 py-1 rounded-xl text-xs font-bold">
                                  Missed (0 pts)
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    );
                  }

                  return (
                    <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 hover:border-zinc-700/50 transition-all duration-300">
                      
                      {/* Match Time & Status */}
                      <div className="text-center md:text-left min-w-[120px]">
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">
                          {new Date(match.kickoffAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                          <span className="bg-green-950/80 text-green-400 px-2 py-0.5 rounded text-[10px] uppercase font-black">Open</span>
                        </div>
                      </div>
 
                      {/* Teams Scoreboard Interface */}
                      <div className="flex items-center gap-2.5 sm:gap-6 justify-center flex-1 w-full">
                        
                        {/* Home Team */}
                        <div className="flex items-center gap-1.5 sm:gap-3 w-1/3 justify-end">
                          <span className="font-bold text-zinc-200 text-right text-xs sm:text-sm md:text-base truncate max-w-[80px] sm:max-w-none">
                            {match.homeTeam ? match.homeTeam.shortName : "TBD"}
                          </span>
                          {match.homeTeam?.flagUrl && (
                            <img src={match.homeTeam.flagUrl} alt="flag" className="w-7 h-4.5 sm:w-8 sm:h-5 object-cover rounded border border-zinc-850" />
                          )}
                        </div>
 
                        {/* Prediction / Scoreboards Visuals */}
                        {hasSavedPred ? (
                          // Saved Prediction View (Scoreboard style)
                          <div className="flex flex-col items-center gap-1 min-w-[100px] sm:min-w-[120px]">
                            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest">Your Prediction</span>
                            <span className="text-lg sm:text-xl font-black bg-zinc-950/80 px-3 py-1.5 sm:px-4 sm:py-2 border border-zinc-850 rounded-xl text-amber-500 tracking-wider">
                              {savedHome} : {savedAway}
                            </span>
                          </div>
                        ) : (
                          // Unpredicted Inputs
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <input
                              type="text"
                              maxLength={2}
                              value={scores[match.id]?.home || ""}
                              onChange={(e) => handleScoreChange(match.id, "home", e.target.value)}
                              disabled={isLockLimitReached || isTBD}
                              className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-950 border border-zinc-800 text-center rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-amber-500 disabled:opacity-30 transition-all"
                              placeholder="-"
                            />
                            <span className="text-zinc-650 font-bold">:</span>
                            <input
                              type="text"
                              maxLength={2}
                              value={scores[match.id]?.away || ""}
                              onChange={(e) => handleScoreChange(match.id, "away", e.target.value)}
                              disabled={isLockLimitReached || isTBD}
                              className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-950 border border-zinc-800 text-center rounded-xl text-base sm:text-lg font-bold focus:outline-none focus:border-amber-500 disabled:opacity-30 transition-all"
                              placeholder="-"
                            />
                          </div>
                        )}
 
                        {/* Away Team */}
                        <div className="flex items-center gap-1.5 sm:gap-3 w-1/3 justify-start">
                          {match.awayTeam?.flagUrl && (
                            <img src={match.awayTeam.flagUrl} alt="flag" className="w-7 h-4.5 sm:w-8 sm:h-5 object-cover rounded border border-zinc-850" />
                          )}
                          <span className="font-bold text-zinc-200 text-left text-xs sm:text-sm md:text-base truncate max-w-[80px] sm:max-w-none">
                            {match.awayTeam ? match.awayTeam.shortName : "TBD"}
                          </span>
                        </div>
 
                      </div>
 
                      {/* Actions Button */}
                      <div className="w-full md:w-auto text-center">
                        {isTBD ? (
                          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider bg-zinc-950/30 border border-zinc-850/40 px-4 py-2 rounded-xl block md:inline-block">
                            Yet to be decided
                          </span>
                        ) : hasSavedPred ? (
                          <button
                            onClick={() => openEditModal(match, savedHome, savedAway)}
                            className="w-full md:w-auto h-9 md:h-10 px-6 bg-zinc-850 text-zinc-250 font-semibold rounded-xl hover:bg-zinc-800 border border-zinc-800 cursor-pointer transition-all hover:text-amber-500"
                          >
                            Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInlineSave(match)}
                            disabled={isLockLimitReached}
                            className={`w-full md:w-auto h-10 px-6 font-semibold rounded-xl transition-all ${
                              isLockLimitReached
                                ? "bg-zinc-950 text-zinc-750 border border-zinc-900 cursor-not-allowed opacity-50"
                                : "bg-amber-500 text-black hover:bg-amber-400 cursor-pointer"
                            }`}
                          >
                            {isLockLimitReached ? "Sign in to Unlock" : "Predict"}
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-zinc-500">
            {activeTab === "open"
              ? "No upcoming matches to predict right now."
              : "No match results available yet."}
          </div>
        )}
      </div>

      {/* Prediction Edit Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-amber-500">Edit Prediction</h3>
              <button 
                onClick={() => setEditingMatch(null)} 
                className="text-zinc-500 hover:text-zinc-300 font-bold p-1 text-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Match details & team visual block */}
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">
                {new Date(editingMatch.kickoffAt).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              
              <div className="flex items-center justify-center gap-6 w-full my-4">
                {/* Home Team */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  {editingMatch.homeTeam?.flagUrl && (
                    <img src={editingMatch.homeTeam.flagUrl} alt="flag" className="w-12 h-8 object-cover rounded border border-zinc-800 shadow-md" />
                  )}
                  <span className="font-bold text-sm text-zinc-250 block truncate max-w-full">
                    {editingMatch.homeTeam ? editingMatch.homeTeam.name : "TBD"}
                  </span>
                </div>

                {/* VS */}
                <span className="text-zinc-650 font-black text-xl">VS</span>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  {editingMatch.awayTeam?.flagUrl && (
                    <img src={editingMatch.awayTeam.flagUrl} alt="flag" className="w-12 h-8 object-cover rounded border border-zinc-800 shadow-md" />
                  )}
                  <span className="font-bold text-sm text-zinc-250 block truncate max-w-full">
                    {editingMatch.awayTeam ? editingMatch.awayTeam.name : "TBD"}
                  </span>
                </div>
              </div>

              {/* Score edit inputs */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Home</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={editHomeScore}
                    onChange={(e) => setEditHomeScore(e.target.value.replace(/\D/g, ""))}
                    className="w-16 h-16 bg-zinc-950 border border-zinc-800 text-center rounded-2xl text-2xl font-black text-amber-500 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
                <span className="text-zinc-650 font-bold text-2xl mt-4">:</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Away</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={editAwayScore}
                    onChange={(e) => setEditAwayScore(e.target.value.replace(/\D/g, ""))}
                    className="w-16 h-16 bg-zinc-950 border border-zinc-800 text-center rounded-2xl text-2xl font-black text-amber-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setEditingMatch(null)}
                className="flex-1 h-12 bg-zinc-850 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-850 hover:text-zinc-50 border border-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSave}
                className="flex-1 h-12 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
