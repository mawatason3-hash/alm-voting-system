'use client'
import React from 'react'
import ProtectedPage from '../../components/ProtectedPage'

export default function Confirmation() {
  return (
    <ProtectedPage>
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold">Thank you</h2>
      <p className="mt-2">Your votes have been recorded. Thank you for participating in ALM elections.</p>
      <div className="mt-4">
        <a href="/dashboard" className="px-4 py-2 bg-navy text-white rounded">Back to dashboard</a>
      </div>
    </div>
    </ProtectedPage>
  )
}
