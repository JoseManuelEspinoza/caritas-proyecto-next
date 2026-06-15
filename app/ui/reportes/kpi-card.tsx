"use client";

export function KpiCard({
  icon, label, value, sub, unit, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 ${
      accent ? "border-[#009850]/30" : "border-gray-200"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          accent ? "bg-[#009850]/15" : "bg-[#009850]/10"
        }`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1 leading-none">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-sm text-gray-400 font-medium">{unit}</span>}
          </div>
          <div className="text-xs font-semibold text-gray-600 mt-1 leading-tight">{label}</div>
          {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
