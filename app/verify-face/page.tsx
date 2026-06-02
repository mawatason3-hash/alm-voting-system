'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyFaceRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/otp-verify')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-xl rounded-3xl border border-slate-700 bg-[#0b172a] p-8 text-center">
        <p className="text-lg font-semibold">Redirecting to OTP verification...</p>
        <p className="mt-3 text-sm text-slate-400">If you are not redirected, <a href="/otp-verify" className="text-amber-300 underline">click here</a>.</p>
      </div>
    </div>
  )
}
