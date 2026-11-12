type Mode = "document" | "hybrid" | "general";

type ModeToggleProps = {
  value: Mode;
  onChange: (mode: Mode) => void;
};

const modes: Array<{ key: Mode; label: string }> = [
  { key: "document", label: "Document only" },
  { key: "hybrid", label: "Hybrid" },
  { key: "general", label: "General AI" },
];

export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-full border border-cyan-200 bg-cyan-50 p-2">

      {modes.map((mode) => (
        <button
          key={mode.key}
          type="button"
          onClick={() => onChange(mode.key)}
          className={
            value === mode.key
              ?  "rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-red-600 transition-colors shadow-lg shadow-orange-900/40"
              : "rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-cyan-50"
          }
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
