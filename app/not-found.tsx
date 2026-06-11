import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-8 flex flex-col justify-between">
      {/* Header */}
      <Header subtitle="FIFA World Cup 2026 Predictor" />

      {/* Main 404 Content */}
      <main className="max-w-md w-full mx-auto my-auto text-center space-y-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl animate-in fade-in duration-300">
        <div className="text-6xl md:text-7xl font-black text-amber-500">
          404
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-wide text-zinc-100">
            Offside! Page Not Found
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The page you are looking for does not exist or has been moved. You might have wandered into an offside position!
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/matches"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-500 px-8 font-extrabold text-sm text-black hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/10"
          >
            Back to Matchday
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center border-t border-zinc-900 pt-4 mt-8 text-zinc-500 text-xs">
        <p>Built by <a href="https://me-teal-xi.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:underline text-amber-500 font-bold">Ogheneyoma</a></p>
      </footer>
    </div>
  );
}
