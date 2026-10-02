"use client";

import { Discover } from "@/components/Discover";
import { Home } from "@/components/Home";
import { MyCatch } from "@/components/MyCatch";
import { ProfileView } from "@/components/ProfileView";
import { WeekWizard } from "@/components/WeekWizard";
import { formatDate } from "@/lib/dates";
import { useStore, type View } from "@/lib/store";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "discover", label: "Discover", icon: "◎" },
  { id: "catch", label: "My Catch", icon: "♥" },
  { id: "wizard", label: "Week Wizard", icon: "▦" },
  { id: "profile", label: "Student Profile", icon: "☺" },
];

export function Shell() {
  const { ready, view, setView, catches, today } = useStore();
  const n = Object.keys(catches).length;
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-plum-900 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:py-6">
          <button onClick={() => setView("home")} className="text-left" aria-label="Gator Radar home">
            <span className="text-2xl font-extrabold tracking-tight">
              Gator <span className="text-gold-300">Radar</span>
              <span aria-hidden className="text-gold-300">)))</span>
            </span>
            <span className="block text-xs text-lav-200">Discover. Catch. Plan.</span>
          </button>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-2 md:block md:space-y-1 md:px-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold md:w-full ${
                view === item.id ? "bg-white text-plum-900" : "text-lav-100 hover:bg-plum-800"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
              {item.id === "catch" && n > 0 && (
                <span className="ml-auto rounded-full bg-gold-300 px-2 text-xs text-plum-900">{n}</span>
              )}
            </button>
          ))}
        </nav>
        <p className="hidden px-5 pt-6 text-xs text-lav-300 md:block">
          San Francisco State University
          <br />
          {ready && `Today: ${formatDate(today, { weekday: "short", month: "short", day: "numeric" })} (Pacific)`}
        </p>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        {!ready ? (
          <p role="status" className="text-plum-700">Loading Gator Radar…</p>
        ) : (
          <div className="mx-auto max-w-6xl">
            {view === "home" && <Home />}
            {view === "discover" && <Discover />}
            {view === "catch" && <MyCatch />}
            {view === "wizard" && <WeekWizard />}
            {view === "profile" && <ProfileView />}
          </div>
        )}
      </main>
    </div>
  );
}
