'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '../../lib/auth'

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = getToken()
    if (!token) {
      router.replace('/login')
    }
  }, [router])

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center">Checking session...</div>
  }

  return <>{children}</>
}
