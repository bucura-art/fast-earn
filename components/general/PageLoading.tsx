export default function PageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-center text-2xl font-bold animate-pulse">Loading...</p>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="admin-loading-slider h-full w-1/3 rounded-full bg-blue-600" />
        </div>
      </div>
    </div>
  )
}