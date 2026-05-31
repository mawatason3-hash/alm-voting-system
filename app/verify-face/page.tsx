'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedPage from '../components/ProtectedPage'
import api from '../../lib/api'
import { getToken } from '../../lib/auth'

interface AdminContact {
  admin_phone: string
  admin_whatsapp: string
  admin_hours: string
}

export default function VerifyFace() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<'instructions' | 'camera' | 'processing' | 'success' | 'failed' | 'permission-denied' | 'no-photo'>('instructions')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [confidence, setConfidence] = useState(0)
  const [adminContact, setAdminContact] = useState<AdminContact>({ admin_phone: '', admin_whatsapp: '', admin_hours: '' })
  const [voterName, setVoterName] = useState('')

  // Check if user has a profile photo
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/voter/profile')
        if (!res.data?.photo_url) {
          setStep('no-photo')
        }
        setVoterName(res.data?.full_name || '')
      } catch (err) {
        console.error('Profile fetch error:', err)
      }
    }

    const fetchAdminContact = async () => {
      try {
        const res = await api.get('/api/settings/admin-contact')
        setAdminContact(res.data)
      } catch (err) {
        console.warn('Admin contact fetch failed:', err)
      }
    }

    fetchProfile()
    fetchAdminContact()
  }, [])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // BUG FIX 3A: Camera must start ONLY on user gesture (button tap)
  // NEVER on page load
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })

      streamRef.current = stream
      setStep('camera')
      setCameraReady(true)

      // Wait for the video element to render before attaching the stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = true
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.setAttribute('webkit-playsinline', 'true')
          videoRef.current
            .play()
            .catch(e => console.error('Play failed:', e))
        }
      }, 100)
    } catch (err: any) {
      console.error('Camera error:', err.name, err.message)

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStep('permission-denied')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.')
        setError('No camera found on this device.')
      } else if (err.name === 'NotReadableError') {
        setCameraError('Camera is being used by another app. Close other apps and try again.')
        setError('Camera is being used by another app. Close other apps and try again.')
      } else {
        setCameraError(`Camera error: ${err.message}. Please refresh.`)
        setError(`Camera error: ${err.message}. Please refresh.`)
      }
    }
  }

  // BUG FIX 3B: Capture selfie and send to backend
  const captureSelfie = async () => {
    if (!videoRef.current || !cameraReady) return

    try {
      setStep('processing')

      // Stop camera first
      streamRef.current?.getTracks().forEach(t => t.stop())
      setCameraReady(false)

      // Capture frame from video
      const canvas = document.createElement('canvas')
      const video = videoRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Canvas not supported')

      // Mirror back (un-mirror the mirrored video for selfie look)
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)

      // Convert to base64 JPEG
      const selfieBase64 = canvas.toDataURL('image/jpeg', 0.85)

      console.log('Selfie captured, size:', selfieBase64.length)

      // Send to backend
      const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace('http://', 'https://')
      const token = getToken()

      if (!token) {
        setError('Unable to verify. Please sign in again and refresh the page.')
        setStep('instructions')
        return
      }

      console.log('Sending to:', `${BASE}/api/voter/verify-selfie`)
      console.log('Token present:', !!token)

      const res = await fetch(
        `${BASE}/api/voter/verify-selfie`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            selfie_base64: selfieBase64
          })
        }
      )

      console.log('Response status:', res.status)
      const data = await res.json()
      console.log('Response data:', data)

      if (data.verified) {
        // BUG FIX 1B: Set flag for route protection
        sessionStorage.setItem('selfie_verified', 'true')
        setConfidence(data.confidence || 0)
        setStep('success')
        setTimeout(() => router.push('/vote'), 2000)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= 3) {
          setStep('failed')
        } else {
          setStep('instructions')
          setError(
            (data.message || 'Face did not match') +
            ' — Please try again in better lighting.'
          )
        }
      }
    } catch (err: any) {
      console.error('Selfie error:', err)
      setAttempts(a => a + 1)
      setStep('instructions')
      setError(
        'Verification failed. Check your connection and try again.'
      )
    }
  }

  const renderInstructionsScreen = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Identity Verification</h1>
        <p className="mt-4 text-slate-300">
          Tap the button below to open your camera and take a selfie. When asked, please tap Allow to enable your camera.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-[#0b172a] p-6 space-y-3 text-sm text-slate-300">
        <p className="font-semibold text-white">Tips for best results:</p>
        <ul className="space-y-2 list-inside">
          <li>✓ Good lighting (face frontally lit)</li>
          <li>✓ Face centered and forward-facing</li>
          <li>✓ No glasses or heavy shadows</li>
          <li>✓ Similar to your registration photo</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        onClick={startCamera}
        className="w-full rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 min-h-[56px]"
      >
        Open Camera
      </button>
    </div>
  )

  const renderCameraScreen = () => (
    <div className="space-y-4">
      <button
        onClick={captureSelfie}
        className="w-full rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 min-h-[56px]"
      >
        Take Selfie Now
      </button>

      <div className="rounded-2xl border border-slate-800 bg-[#0b172a] p-4 text-sm text-slate-300">
        {error ? <p className="text-red-300">{error}</p> : <p>Keep your face centered in the oval and avoid strong shadows.</p>}
      </div>
    </div>
  )

  const renderProcessingScreen = () => (
    <div className="rounded-3xl border border-slate-800 bg-[#071421] p-8 text-center text-slate-200 shadow-xl">
      <div className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
      <h2 className="text-2xl font-semibold text-white">Comparing your selfie with your profile…</h2>
      <p className="mt-3 text-sm text-slate-400">This takes just a moment.</p>
    </div>
  )

  const renderSuccessScreen = () => (
    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-white shadow-xl">
      <div className="mb-5 text-5xl">✅</div>
      <h2 className="text-2xl font-semibold">Identity Confirmed!</h2>
      <p className="mt-4 text-sm text-slate-100">Welcome, {voterName}. Redirecting to the ballot…</p>
    </div>
  )

  const renderFailedScreen = () => (
    <div className="space-y-5 rounded-3xl border border-slate-800 bg-[#071421] p-6 shadow-xl">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-4xl text-red-300">
          ❌
        </div>
        <h2 className="text-2xl font-semibold text-white">Verification Failed</h2>
        <p className="mt-3 text-sm text-slate-400">We could not confirm your identity after {attempts} attempts.</p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => {
            setError('')
            setAttempts(0)
            setCameraError('')
            setStep('instructions')
          }}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Try Again from Start
        </button>
        <button
          type="button"
          onClick={() => router.push('/verify-face/contact-admin')}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:border-slate-500"
        >
          Contact Admin for Help
        </button>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-[#0b172a] p-4 text-sm text-slate-200">
        <p className="font-semibold text-white">Need help? Contact our admin:</p>
        {adminContact.admin_phone ? (
          <a href={`tel:${adminContact.admin_phone}`} className="mt-3 block text-lg font-semibold text-amber-300">
            📞 Call Admin: {adminContact.admin_phone}
          </a>
        ) : null}
        {adminContact.admin_whatsapp ? (
          <a
            href={`https://wa.me/${adminContact.admin_whatsapp.replace(/[^0-9]/g, '')}`}
            className="mt-3 block text-lg font-semibold text-emerald-300"
          >
            💬 WhatsApp Admin
          </a>
        ) : null}
      </div>
    </div>
  )

  const renderPermissionDeniedScreen = () => (
    <div className="rounded-3xl border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-xl space-y-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-4xl text-amber-300">
        🔒
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white">Camera Access Needed</h2>
        <p className="mt-3 text-sm text-slate-400">
          To verify your identity, we need access to your camera. Please tap the button below and select Allow when asked.
        </p>
      </div>

      <button
        onClick={() => {
          setStep('instructions')
          setCameraError('')
        }}
        className="w-full rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        Try Again
      </button>

      <p className="text-sm text-slate-500">
        If the camera popup does not appear, close this page and reopen it.
      </p>
    </div>
  )

  const renderNoPhotoScreen = () => (
    <div className="rounded-3xl border border-slate-700 bg-[#071421] p-6 text-center text-slate-200 shadow-xl space-y-6">
      <div className="text-4xl">📷</div>
      <div>
        <h2 className="text-2xl font-semibold text-white">No profile photo found</h2>
        <p className="mt-3 text-sm text-slate-400">
          Please contact admin — your account may need to be updated with a profile photo.
        </p>
      </div>
      {adminContact.admin_phone ? (
        <a href={`tel:${adminContact.admin_phone}`} className="block rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300">
          Call Admin: {adminContact.admin_phone}
        </a>
      ) : null}
    </div>
  )

  const renderContent = () => {
    switch (step) {
      case 'instructions':
        return renderInstructionsScreen()
      case 'camera':
        return renderCameraScreen()
      case 'processing':
        return renderProcessingScreen()
      case 'success':
        return renderSuccessScreen()
      case 'failed':
        return renderFailedScreen()
      case 'permission-denied':
        return renderPermissionDeniedScreen()
      case 'no-photo':
        return renderNoPhotoScreen()
      default:
        return renderInstructionsScreen()
    }
  }

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-[#071421] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="verify-face-video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="verify-face-video"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current
                    .play()
                    .catch(e => console.error('Play failed:', e))
                  console.log('Video dimensions:', videoRef.current.videoWidth, videoRef.current.videoHeight)
                }
              }}
            />

            {step === 'camera' && (
              <>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 400 500"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <mask id="oval-mask">
                      <rect width="400" height="500" fill="white" />
                      <ellipse cx="200" cy="250" rx="120" ry="150" fill="black" />
                    </mask>
                  </defs>
                  <rect width="400" height="500" fill="rgba(0,0,0,0.4)" mask="url(#oval-mask)" />
                  <ellipse
                    cx="200"
                    cy="250"
                    rx="120"
                    ry="150"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                </svg>
                <p className="absolute inset-x-0 bottom-6 text-center text-amber-300 font-semibold">
                  Position your face in the oval
                </p>
              </>
            )}
          </div>

          {renderContent()}
        </div>
      </div>
    </ProtectedPage>
  )
}
