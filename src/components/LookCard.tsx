interface Look {
  naam: string;
  bovenstuk: string;
  onderstuk: string;
  schoenen: string;
  accessoires: string;
  stijltip: string;
}

const ITEMS: { key: keyof Look; label: string; icon: string }[] = [
  { key: "bovenstuk", label: "Bovenstuk", icon: "👕" },
  { key: "onderstuk", label: "Onderstuk", icon: "👖" },
  { key: "schoenen", label: "Schoenen", icon: "👟" },
  { key: "accessoires", label: "Accessoires", icon: "🧢" },
];

export default function LookCard({ look }: { look: Look }) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-md">
      <div className="bg-[#C1272D] px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <h2 className="text-white text-xl font-bold">{look.naam}</h2>
        </div>
      </div>

      <div className="h-1 bg-[#006233]" />

      <div className="bg-white p-6 grid gap-4">
        {ITEMS.map(({ key, label, icon }) => (
          <div key={key} className="flex gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-gray-800 text-sm leading-relaxed mt-0.5">
                {look[key]}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border-t border-amber-200 px-6 py-4">
        <div className="flex gap-3">
          <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Stijltip
            </p>
            <p className="text-amber-900 text-sm leading-relaxed mt-0.5">
              {look.stijltip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
