export default function KitsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="animate-pulse h-5 bg-gray-200 rounded w-44" />
          <div className="animate-pulse h-3 bg-gray-200 rounded w-32" />
        </div>
        <div className="animate-pulse h-9 bg-gray-200 rounded-lg w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 space-y-2"
          >
            <div className="h-3 bg-gray-200 rounded w-28" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#DDDDDD] rounded-xl divide-y divide-gray-100">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-48" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
            <div className="h-5 bg-gray-200 rounded-full w-20 hidden md:block" />
            <div className="h-4 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
