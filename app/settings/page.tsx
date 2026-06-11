"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";

interface UserStats {
  emailNotificationsEnabled: boolean;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // 1. Fetch user settings (from the stats endpoint)
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/stats");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Initialize state from db
  useEffect(() => {
    if (stats) {
      setEmailNotifications(stats.emailNotificationsEnabled);
    }
  }, [stats]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 2. Save Settings Mutation
  const saveSettings = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/users/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotificationsEnabled: enabled }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      setToast({ text: "Settings saved successfully!", isError: false });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
    onError: () => {
      setToast({ text: "Failed to save settings.", isError: true });
    },
  });

  const handleSaveSettings = () => {
    saveSettings.mutate(emailNotifications);
  };

  // Check if settings have been modified compared to DB
  const isDirty = stats !== undefined && emailNotifications !== stats.emailNotificationsEnabled;
  const isPending = saveSettings.isPending;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans px-2 py-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8 relative">
        <Header subtitle="Account Settings" />

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

        {isLoading ? (
          <div className="text-center py-24 text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Loading settings...
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl animate-in fade-in duration-300">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-black text-amber-500 uppercase tracking-wide">
                Notification Preferences
              </h2>
              <p className="text-zinc-500 text-xs mt-1">
                Customize how and when you receive email notifications from World Cup Predictor.
              </p>
            </div>

            <div className="flex items-start gap-4 py-2">
              <input
                type="checkbox"
                id="email-checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="mt-1 h-5 w-5 bg-zinc-950 border border-zinc-800 rounded focus:ring-amber-500 text-amber-500 accent-amber-500 transition-colors cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="email-checkbox" className="font-extrabold text-sm text-zinc-200 cursor-pointer block">
                  Daily Prediction Reminders
                </label>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
                  Receive a daily reminder notification email if you have upcoming matches that you haven't predicted yet. Toggling this off will unsubscribe you from reminder alerts.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={!isDirty || isPending}
                className={`h-11 px-6 font-extrabold rounded-xl text-sm transition-all duration-200 ${
                  isDirty && !isPending
                    ? "bg-amber-500 text-black hover:bg-amber-400 cursor-pointer shadow-md"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-50"
                }`}
              >
                {isPending ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
