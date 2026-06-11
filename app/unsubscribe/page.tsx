"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [userEmail, setUserEmail] = useState("");

  const handleUnsubscribe = async () => {
    if (!userId) {
      setStatus("error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error("Unsubscribe failed");
      }

      const data = await res.json();
      setUserEmail(data.email || "");
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="max-w-md mx-auto bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-black text-amber-500 uppercase tracking-wide">Invalid Link</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          The unsubscribe link is missing parameters. If you want to unsubscribe, please change your preferences directly on the settings page.
        </p>
        <div className="pt-4">
          <Link href="/settings" className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-500 px-6 text-sm font-semibold text-black hover:bg-amber-400 transition-colors">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-xl animate-in fade-in duration-300">
        <div className="text-4xl">✉️</div>
        <h2 className="text-lg font-black text-amber-500 uppercase tracking-wide">Unsubscribed</h2>
        <p className="text-zinc-300 text-sm leading-relaxed">
          You have successfully unsubscribed from daily prediction reminder emails for <strong className="text-zinc-100">{userEmail}</strong>.
        </p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          You can turn reminders back on at any time from your account settings.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 px-6 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-xl animate-in fade-in duration-300">
      <div className="text-4xl">🔕</div>
      <div>
        <h2 className="text-lg font-black text-zinc-100 uppercase tracking-wide">Unsubscribe Reminders</h2>
        <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
          Confirm that you want to unsubscribe from daily World Cup Predictor match notification emails.
        </p>
      </div>

      {status === "error" && (
        <p className="text-red-500 text-xs font-bold bg-red-950/20 border border-red-900/30 p-3 rounded-xl animate-in shake duration-300">
          Failed to process your request. Please try again or unsubscribe in Settings.
        </p>
      )}

      <div className="pt-2 flex flex-col gap-3">
        <button
          onClick={handleUnsubscribe}
          disabled={loading}
          className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {loading ? "Processing..." : "Unsubscribe from Reminders"}
        </button>
        <Link href="/" className="w-full h-11 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-bold rounded-xl text-sm transition-colors">
          Cancel & Return
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Header subtitle="Notification Settings" />
        <Suspense fallback={
          <div className="text-center py-24 text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Loading unsubscribe details...
          </div>
        }>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </div>
  );
}
