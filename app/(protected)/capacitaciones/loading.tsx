export default function CapacitacionesLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="animate-pulse w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="space-y-1.5">
          <div className="animate-pulse h-5 bg-gray-200 rounded w-48" />
          <div className="animate-pulse h-3 bg-gray-200 rounded w-36" />
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-pulse flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg" />
        ))}
      </div>

      {/* Course cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl overflow-hidden"
          >
            <div className="h-1.5 bg-gray-200 w-full" />
            <div className="p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-200 rounded-full w-20" />
                <div className="w-4 h-4 bg-gray-200 rounded" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <div className="flex gap-3">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
