"use client"

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-900/95 p-10 text-center shadow-xl shadow-slate-950/20">
        <h1 className="text-4xl font-bold text-white">Something went wrong</h1>
        <p className="mt-4 text-slate-300">An unexpected error occurred while loading this page.</p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
