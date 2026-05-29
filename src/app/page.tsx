"use client";

import { useState } from "react";
import LookCard from "@/components/LookCard";

interface Look {
  naam: string;
  bovenstuk: string;
  onderstuk: string;
  schoenen: string;
  accessoires: string;
  stijltip: string;
}

const GENDER_OPTIONS = [
  { value: "man", label: "Man" },
  { value: "vrouw", label: "Vrouw" },
  { value: "non-binair", label: "Non-binair" },
];

const OCCASION_OPTIONS = [
  { value: "voetbalwedstrijd", label: "Voetbalwedstrijd" },
  { value: "straat", label: "Straatlook" },
  { value: "feest", label: "Feest / Soiree" },
  { value: "casual", label: "Casual Dagelijks" },
  { value: "eid", label: "Eid / Feestdag" },
];

const VIBE_OPTIONS = [
  { value: "ultras supporter", label: "Ultras Supporter" },
  { value: "traditioneel Marokkaans", label: "Traditioneel Marokkaans" },
  { value: "retro jaren 90", label: "Retro Jaren '90" },
  { value: "streetwear Casablanca", label: "Streetwear Casablanca" },
  { value: "Mustapha Hadji stijl", label: "Mustapha Hadji Stijl" },
];

export default function Home() {
  const [gender, setGender] = useState("");
  const [occasion, setOccasion] = useState("");
  const [vibe, setVibe] = useState("");
  const [look, setLook] = useState<Look | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateLook() {
    if (!gender || !occasion || !vibe) {
      setError("Selecteer alle opties om een look te genereren.");
      return;
    }
    setError("");
    setLoading(true);
    setLook(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, occasion, vibe }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generatie mislukt");
      setLook(data.look);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="bg-[#C1272D] text-white py-6 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">🇲🇦</span>
            <h1 className="text-3xl font-bold tracking-tight">Maroc WK 1998</h1>
            <span className="text-4xl">⚽</span>
          </div>
          <p className="text-red-100 text-sm font-medium tracking-widest uppercase">
            Look Generator — France 98
          </p>
        </div>
      </header>

      <div className="h-2 bg-[#006233]" />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <p className="text-gray-600 text-base max-w-xl mx-auto leading-relaxed">
            Genereer jouw perfecte outfit geïnspireerd op Marokko&apos;s deelname aan
            het WK 1998 in Frankrijk — de legendarische ploeg van Hadji, Naybet en
            Bassir.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="grid gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Geslacht
              </label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGender(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      gender === opt.value
                        ? "bg-[#C1272D] text-white border-[#C1272D]"
                        : "bg-white text-gray-700 border-gray-300 hover:border-[#C1272D]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gelegenheid
              </label>
              <div className="flex flex-wrap gap-2">
                {OCCASION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOccasion(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      occasion === opt.value
                        ? "bg-[#006233] text-white border-[#006233]"
                        : "bg-white text-gray-700 border-gray-300 hover:border-[#006233]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vibe
              </label>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setVibe(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      vibe === opt.value
                        ? "bg-[#C1272D] text-white border-[#C1272D]"
                        : "bg-white text-gray-700 border-gray-300 hover:border-[#C1272D]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            onClick={generateLook}
            disabled={loading}
            className="mt-6 w-full py-3 px-6 rounded-xl font-bold text-white bg-[#C1272D] hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md text-base tracking-wide"
          >
            {loading ? "Genereren..." : "Genereer Mijn Look"}
          </button>
        </div>

        {loading && (
          <div className="animate-pulse bg-gray-100 rounded-2xl p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full" />
            ))}
          </div>
        )}

        {look && !loading && <LookCard look={look} />}
      </div>

      <footer className="py-6 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400">
          Marokko WK 1998 Look Generator — Powered by Claude AI
        </p>
        <p className="text-xs text-gray-400 mt-1">
          المغرب ★ كأس العالم 1998 ★ فرنسا
        </p>
      </footer>
    </main>
  );
}
