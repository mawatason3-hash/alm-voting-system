import './globals.css'
import React from 'react'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'ALM Voting System',
  description: 'Association of Liberians in Musanze - Voting Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 p-2 shadow-lg shadow-slate-950/25">
                  <img src="/logo.jpg" alt="ALM Logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Association of Liberians in Musanze</p>
                  <h1 className="text-lg font-semibold text-white">ALM Voting System</h1>
                </div>
              </div>
              <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <a className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:border-sky-300/50 hover:text-sky-100" href="/login">Login</a>
                <a className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:border-sky-300/50 hover:text-sky-100" href="/register">Register</a>
                <a className="rounded-full border border-sky-300/50 bg-sky-500 px-4 py-2 text-white transition hover:bg-sky-400" href="/admin/login">Admin</a>
              </nav>
            </div>
          </header>

          <main>{children}</main>
          <Toaster richColors position="top-right" />

          <footer className="border-t border-white/10 bg-slate-950/90 py-6 text-center text-sm text-slate-400">
            Designed & Developed by: Solomon Kamara
          </footer>
        </div>
      </body>
    </html>
  )
}
