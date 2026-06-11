export default function GrdLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Status filter grid */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 border border-gray-200 rounded-xl p-3 h-20"
          />
        ))}
      </div>

      {/* Search/filter bar */}
      <div className="bg-white rounded-xl border border-[#DDDDDD] p-4">
        <div className="flex gap-3">
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 flex-1" />
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 w-36" />
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 w-24 hidden md:block" />
        </div>
      </div>

      {/* Incidencia items */}
      <div className="bg-white rounded-xl border border-[#DDDDDD] divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex items-start gap-3 animate-pulse">
            <div className="w-1.5 rounded-full bg-gray-200 self-stretch min-h-[60px]" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="flex gap-4">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
