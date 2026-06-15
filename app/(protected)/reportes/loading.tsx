export default function ReportesLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="space-y-1.5">
            <div className="animate-pulse h-5 bg-gray-200 rounded w-44" />
            <div className="animate-pulse h-3 bg-gray-100 rounded w-56" />
          </div>
        </div>
        <div className="animate-pulse h-9 bg-gray-200 rounded-lg w-32" />
      </div>

      {/* Filter bar */}
      <div className="animate-pulse bg-white rounded-xl border border-[#DDDDDD] p-4 flex gap-4 items-end">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-8 bg-gray-200 rounded-lg w-36" />
        <div className="h-8 bg-gray-200 rounded-lg w-36" />
        <div className="h-8 bg-gray-200 rounded-lg w-20" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl border border-[#DDDDDD] overflow-hidden">
            <div className="h-1 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-2.5 bg-gray-200 rounded w-20" />
              <div className="h-1.5 bg-gray-100 rounded-full mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="animate-pulse bg-white rounded-xl border border-[#DDDDDD] p-5">
        <div className="h-4 bg-gray-200 rounded w-52 mb-1" />
        <div className="h-3 bg-gray-100 rounded w-72 mb-5" />
        <div className="h-52 bg-gray-50 rounded-lg" />
      </div>

      {/* Donut + Parroquias row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl border border-[#DDDDDD] p-5">
            <div className="h-4 bg-gray-200 rounded w-40 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-56 mb-5" />
            <div className="h-64 bg-gray-50 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Tipo + Gravedad + Gauges row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl border border-[#DDDDDD] p-5">
            <div className="h-4 bg-gray-200 rounded w-36 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-48 mb-5" />
            <div className="h-56 bg-gray-50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
