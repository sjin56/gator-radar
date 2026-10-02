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

export function RadarMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14" stroke="#c1b2fb" strokeWidth="2" opacity=".5" />
      <circle cx="16" cy="16" r="9" stroke="#c1b2fb" strokeWidth="2" opacity=".8" />
      <path d="M16 16 L28 8" stroke="#ffd24d" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="#ffd24d" />
    </svg>
  );
}

export function Shell() {
  const { ready, view, setView, catches, today } = useStore();
  const n = Object.keys(catches).length;
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-gradient-to-b from-plum-900 to-plum-950 text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="px-4 py-3 md:px-6 md:pb-4 md:pt-7">
          <button onClick={() => setView("home")} className="flex items-center gap-2.5 text-left" aria-label="Gator Radar home">
            <RadarMark size={34} />
            <span>
              <span className="block text-2xl font-extrabold leading-none tracking-tight">
                Gator <span className="text-gold-300">Radar</span>
              </span>
              <span className="mt-1 block text-[11px] font-medium tracking-wide text-lav-300">Discover · Catch · Plan</span>
            </span>
          </button>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-4 md:pt-2">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition md:w-full ${
                  active ? "bg-white text-plum-900 shadow-md" : "text-lav-100 hover:bg-white/10"
                }`}
              >
                {active && <span aria-hidden className="absolute left-0 top-2 hidden h-[calc(100%-1rem)] w-1 rounded-full bg-gold-400 md:block" />}
                <span aria-hidden className={`w-5 text-center text-base ${active ? "text-plum-600" : "text-gold-300"}`}>{item.icon}</span>
                {item.label}
                {item.id === "catch" && n > 0 && (
                  <span className="ml-auto rounded-full bg-gold-300 px-2 py-0.5 text-xs font-bold text-plum-950">{n}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto hidden px-5 pb-6 md:block">
          <div className="rounded-2xl bg-white/10 p-4 text-xs leading-relaxed text-lav-100">
            <p className="font-bold text-white">San Francisco State University</p>
            {ready && <p>{formatDate(today, { weekday: "long", month: "short", day: "numeric" })} · Pacific</p>}
            <p className="mt-2 text-gold-300">Prototype with demo data. Always verify with official sources.</p>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-9">
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
