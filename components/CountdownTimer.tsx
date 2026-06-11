"use client";

import { useState, useEffect } from "react";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
  status: "before" | "during" | "after";
}

export default function CountdownTimer() {
  const startDate = new Date("2026-06-11T19:00:00Z"); // World Cup Kickoff (MEX vs RSA)
  const endDate = new Date("2026-07-19T21:00:00Z");   // World Cup Final Conclusion

  const calculateTimeRemaining = (): TimeRemaining => {
    const now = new Date();
    
    if (now < startDate) {
      const difference = startDate.getTime() - now.getTime();
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        label: "Tournament Kickoff In",
        status: "before"
      };
    } else if (now >= startDate && now < endDate) {
      const difference = endDate.getTime() - now.getTime();
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        label: "World Cup Ends In",
        status: "during"
      };
    } else {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        label: "Tournament Concluded",
        status: "after"
      };
    }
  };

  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    // Set initial time right after mount on the client to avoid SSR mismatch
    setTimeLeft(calculateTimeRemaining());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    // Skeleton placeholder to prevent visual layout shifts
    return (
      <div className="h-[90px] w-full max-w-sm mx-auto my-6 bg-zinc-900/20 border border-zinc-800/40 rounded-2xl animate-pulse" />
    );
  }

  if (timeLeft.status === "after") {
    return (
      <div className="inline-flex items-center gap-2.5 px-6 py-3 bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-400 font-extrabold text-sm tracking-wide shadow-md my-6">
        🏆 WORLD CUP 2026 CONCLUDED (READ-ONLY ARCHIVE)
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 my-6">
      <div className="flex items-center gap-2">
        {timeLeft.status === "during" && (
          <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-ping" />
        )}
        <div className={`text-xs font-black uppercase tracking-widest ${
          timeLeft.status === "during" ? "text-emerald-400" : "text-zinc-550"
        }`}>
          {timeLeft.label}
        </div>
      </div>
      
      <div className={`grid grid-cols-4 gap-3.5 w-full max-w-sm border rounded-2.5xl p-4 shadow-xl shadow-black/40 backdrop-blur-md ${
        timeLeft.status === "during" 
          ? "bg-zinc-900/40 border-zinc-800/80" 
          : "bg-zinc-900/30 border-zinc-800/60"
      }`}>
        {/* Days */}
        <div className="flex flex-col items-center bg-zinc-950/60 border border-zinc-900/80 rounded-xl py-2 px-1">
          <span className={`text-2xl md:text-3xl font-black tracking-tight ${
            timeLeft.status === "during" ? "text-emerald-400" : "text-amber-500"
          }`}>
            {timeLeft.days.toString().padStart(2, "0")}
          </span>
          <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider mt-0.5">
            Days
          </span>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center bg-zinc-950/60 border border-zinc-900/80 rounded-xl py-2 px-1">
          <span className={`text-2xl md:text-3xl font-black tracking-tight ${
            timeLeft.status === "during" ? "text-emerald-400" : "text-amber-500"
          }`}>
            {timeLeft.hours.toString().padStart(2, "0")}
          </span>
          <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider mt-0.5">
            Hours
          </span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center bg-zinc-950/60 border border-zinc-900/80 rounded-xl py-2 px-1">
          <span className={`text-2xl md:text-3xl font-black tracking-tight ${
            timeLeft.status === "during" ? "text-emerald-400" : "text-amber-500"
          }`}>
            {timeLeft.minutes.toString().padStart(2, "0")}
          </span>
          <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider mt-0.5">
            Mins
          </span>
        </div>

        {/* Seconds */}
        <div className="flex flex-col items-center bg-zinc-950/60 border border-zinc-900/80 rounded-xl py-2 px-1">
          <span className={`text-2xl md:text-3xl font-black tracking-tight ${
            timeLeft.status === "during" ? "text-emerald-400" : "text-amber-500"
          }`}>
            {timeLeft.seconds.toString().padStart(2, "0")}
          </span>
          <span className="text-[9px] uppercase font-bold text-zinc-550 tracking-wider mt-0.5">
            Secs
          </span>
        </div>
      </div>
    </div>
  );
}
