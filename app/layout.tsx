import './globals.css'
import React from 'react'
import { Toaster } from 'sonner'
import { HeaderClient } from './components/HeaderClient'

export const metadata = {
  title: 'ALM Voting System',
  description: 'Association of Liberians in Musanze - Voting Platform',
  icons: {
    icon: '/logo.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <HeaderClient>
          {children}
        </HeaderClient>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
