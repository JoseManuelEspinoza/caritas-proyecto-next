export default function ReportesLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header + date filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="animate-pulse h-6 bg-gray-200 rounded w-36" />
          <div className="animate-pulse h-3 bg-gray-200 rounded w-52" />
        </div>
        <div className="flex gap-2 items-center animate-pulse">
          <div className="h-9 bg-gray-200 rounded-lg w-36" />
          <div className="h-4 bg-gray-200 rounded w-4" />
          <div className="h-9 bg-gray-200 rounded-lg w-36" />
          <div className="h-9 bg-gray-200 rounded-lg w-24" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-28" />
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-10 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 h-72 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-56 bg-gray-100 rounded-lg" />
        </div>
        <div className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 h-72 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-36" />
          <div className="h-56 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Export table */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-36" />
          <div className="h-8 bg-gray-200 rounded-lg w-24" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse flex gap-4 py-2 border-b border-gray-100 last:border-0">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-5 bg-gray-200 rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
