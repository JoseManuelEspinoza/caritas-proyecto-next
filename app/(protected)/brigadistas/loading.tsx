export default function BrigadistasLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="animate-pulse h-5 bg-gray-200 rounded w-48" />
          <div className="animate-pulse h-3 bg-gray-200 rounded w-32" />
        </div>
        <div className="flex gap-2">
          <div className="animate-pulse h-9 bg-gray-200 rounded-lg w-24 hidden md:block" />
          <div className="animate-pulse h-9 bg-gray-200 rounded-lg w-36" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 flex-1" />
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 w-40" />
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 w-40" />
        </div>
      </div>

      {/* Brigadista list */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-200 rounded w-28" />
            </div>
            <div className="h-5 bg-gray-200 rounded-full w-16 hidden md:block" />
            <div className="h-5 bg-gray-200 rounded-full w-16 hidden md:block" />
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-1 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
