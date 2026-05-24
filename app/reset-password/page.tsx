'use client'
import React, { useState } from 'react'
import api from '../../lib/api'
import { useSearchParams } from 'next/navigation'
import { notify } from '../../lib/notifications'

export default function Reset() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e:React.FormEvent) => {
    e.preventDefault()
    try{
      await api.post('/api/auth/reset-password', { token, password })
      setMsg('Password reset successful')
      notify.success('Password reset successful')
    } catch(err:any) {
      setMsg('Failed')
      notify.error('Password reset failed')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
      <form onSubmit={submit} className="bg-white p-6 rounded shadow space-y-3">
        {msg && <div className="text-green-600">{msg}</div>}
        <input type="password" placeholder="New password" className="w-full border p-2 rounded" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="px-4 py-2 bg-navy text-white rounded">Reset</button>
      </form>
    </div>
  )
}
