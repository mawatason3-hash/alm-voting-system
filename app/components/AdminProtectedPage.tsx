'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getUser } from '../../lib/auth'

export default function AdminProtectedPage({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = getToken()
    const user = getUser()
    if (!token || !user || user.role !== 'admin') {
      router.replace('/admin/login')
    }
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy px-4 text-slate-100">
        <div className="rounded-3xl border border-white/10 bg-slate-950/95 px-6 py-5 text-sm shadow-xl shadow-slate-950/40">
          Checking admin session...
        </div>
      </div>
    )
  }

  return <>{children}</>
}
