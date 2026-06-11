export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* KPI cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 h-64 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>
        <div className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 h-64 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Recent incidents table */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-36" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-5 bg-gray-200 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
