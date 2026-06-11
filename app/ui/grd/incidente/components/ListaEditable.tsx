import { Plus, X } from "lucide-react";

/** Lista de inputs de texto con agregar/quitar (objetivos, hallazgos, etc.). */
export function ListaEditable({
  label,
  items,
  setItems,
  placeholder,
  addLabel,
}: {
  label: string;
  items: string[];
  setItems: (fn: (prev: string[]) => string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-purple-400">•</span>
            <input
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg"
              placeholder={placeholder}
              value={it}
              onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                className="text-red-500 hover:bg-red-50 rounded p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, ""])}
        className="text-[11px] text-purple-600 flex items-center gap-1 mt-1.5"
      >
        <Plus className="w-3 h-3" /> {addLabel}
      </button>
    </div>
  );
}
