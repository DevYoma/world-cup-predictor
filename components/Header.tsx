"use client";

import { useState } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  subtitle: string;
}

export default function Header({ subtitle }: HeaderProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? "text-amber-500 font-bold border-b-2 border-amber-500 pb-1 text-sm transition-all"
      : "text-zinc-300 hover:text-amber-400 font-medium text-sm transition-colors";
  };

  return (
    <header className="relative max-w-4xl w-full mx-auto border-b border-zinc-800 pb-4 mb-8 z-40">
      <div className="flex justify-between items-center">
        {/* Brand / Logo */}
        <div>
          <Link href="/">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-amber-500 hover:opacity-95 transition-opacity">
              World Cup Predictor
            </h1>
          </Link>
          <p className="text-zinc-400 text-xs md:text-sm mt-0.5">{subtitle}</p>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className={getLinkClass("/")}>Home</Link>
          <Link href="/matches" className={getLinkClass("/matches")}>Predictions</Link>
          <Link href="/leaderboard" className={getLinkClass("/leaderboard")}>Leaderboard</Link>
          
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/dashboard" className={getLinkClass("/dashboard")}>Dashboard</Link>
              <Link href="/leagues" className={getLinkClass("/leagues")}>Leagues</Link>
              <Link href="/settings" className={getLinkClass("/settings")}>Settings</Link>
              <div className="pl-2 border-l border-zinc-800">
                <UserButton />
              </div>
            </>
          ) : (
            <Link 
              href="/sign-in" 
              className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-3">
          {isLoaded && isSignedIn && (
            <div className="scale-90">
              <UserButton />
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-zinc-400 hover:text-zinc-200 focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
          >
            <svg
              className="h-6 w-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                // Close Icon
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.828 4.828 4.829z"
                />
              ) : (
                // Hamburger Icon
                <path
                  fillRule="evenodd"
                  d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 md:hidden">
          <Link 
            href="/" 
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors"
          >
            Home
          </Link>
          <Link 
            href="/matches" 
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors"
          >
            Predictions
          </Link>
          <Link 
            href="/leaderboard" 
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors"
          >
            Leaderboard
          </Link>

          {isLoaded && isSignedIn ? (
            <>
              <Link 
                href="/dashboard" 
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/leagues" 
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors"
              >
                Leagues
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors"
              >
                Settings
              </Link>
            </>
          ) : (
            <div className="pt-2 border-t border-zinc-800">
              <Link 
                href="/sign-in" 
                onClick={() => setIsOpen(false)}
                className="flex h-10 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
