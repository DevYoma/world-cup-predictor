import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import Header from "@/components/Header";
import CountdownTimer from "@/components/CountdownTimer";
import PredictionCounter from "@/components/PredictionCounter";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-8 flex flex-col justify-between">
      {/* Navigation Header */}
      <Header subtitle="FIFA World Cup 2026 Predictor" />

      {/* Main Content Hero */}
      <main className="max-w-4xl w-full mx-auto my-auto py-12 flex flex-col items-center justify-center text-center space-y-6">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight max-w-2xl leading-tight">
          Predict the World Cup. <br/>
          <span className="text-amber-500">Outsmart your friends.</span>
        </h2>
        
        {/* Countdown Timer */}
        <CountdownTimer />

        {/* Live prediction counter */}
        <PredictionCounter />

        <p className="text-zinc-400 text-lg max-w-md">
          Predict match scores, earn points for accuracy, and climb the global leaderboard for the FIFA World Cup 2026.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link href="/matches" className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-8 font-semibold text-black hover:bg-amber-400 transition-colors">
            Start Predicting
          </Link>
          {!isSignedIn && (
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 px-8 font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors">
              Create Account
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center border-t border-zinc-900 pt-4 mt-8 text-zinc-500 text-xs">
        <p>Built by <a href="https://me-teal-xi.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:underline text-amber-500 font-bold">Ogheneyoma</a></p>
      </footer>
    </div>
  );
}
