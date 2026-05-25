export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-900/95 p-10 text-center shadow-xl shadow-slate-950/20">
        <h1 className="text-4xl font-bold text-white">Page not found</h1>
        <p className="mt-4 text-slate-300">The page you are looking for does not exist.</p>
      </div>
    </div>
  )
}
