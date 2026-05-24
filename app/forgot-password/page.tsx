'use client'
import React, { useState } from 'react'
import api from '../../lib/api'
import { notify } from '../../lib/notifications'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const submit = async (e:React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/auth/forgot-password', { email })
      setMsg('If email exists a reset link has been sent.')
      notify.success('If email exists a reset link has been sent.')
    } catch (err:any) {
      setMsg('Request failed')
      notify.error('Request failed')
    }
  }
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Forgot Password</h2>
      <form onSubmit={submit} className="bg-white p-6 rounded shadow space-y-3">
        {msg && <div className="text-green-600">{msg}</div>}
        <input placeholder="Email" className="w-full border p-2 rounded" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="px-4 py-2 bg-navy text-white rounded">Send reset</button>
      </form>
    </div>
  )
}
