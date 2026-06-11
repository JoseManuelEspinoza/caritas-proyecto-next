export default function SimulacrosLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="animate-pulse h-5 bg-gray-200 rounded w-40" />
          <div className="animate-pulse h-3 bg-gray-200 rounded w-28" />
        </div>
        <div className="animate-pulse h-9 bg-gray-200 rounded-lg w-36" />
      </div>

      <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
        <div className="flex gap-3">
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 flex-1" />
          <div className="animate-pulse bg-gray-200 rounded-lg h-9 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-[#DDDDDD] rounded-xl p-5 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded-full w-24" />
              <div className="h-4 bg-gray-200 rounded w-4" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
