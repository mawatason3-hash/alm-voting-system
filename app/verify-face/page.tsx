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
    const fetchProfileAndStatus = async () => {
      try {
        const [profileRes, statusRes] = await Promise.all([
          api.get('/api/voter/profile'),
          api.get('/api/voter/verification-status'),
        ])

        if (!profileRes.data?.photo_url) {
          setStep('no-photo')
        }
        setVoterName(profileRes.data?.full_name || '')

        if (statusRes.status === 200 && statusRes.data?.admin_verified) {
          sessionStorage.setItem('admin_approved', 'true')
          router.push('/vote')
          return
        }
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

    fetchProfileAndStatus()
    fetchAdminContact()
  }, [router])

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
    setError('')
    setCameraReady(false)

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 }
        },
        audio: false
      })

      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        setError('Video element not found. Please refresh.')
        return
      }

      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.setAttribute('webkit-playsinline', 'true')

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Video timeout')), 10000)

        video.onloadedmetadata = () => {
          window.clearTimeout(timeout)
          resolve()
        }

        video.onerror = () => {
          window.clearTimeout(timeout)
          reject(new Error('Video failed to load'))
        }
      })

      await video.play()

      console.log('Camera started:', video.videoWidth, 'x', video.videoHeight)
      setStep('camera')
      setCameraReady(true)
    } catch (err: any) {
      console.error('Camera error:', err?.name, err?.message || err)

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStep('permission-denied')
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.')
        setError('No camera found on this device.')
      } else if (err?.name === 'NotReadableError') {
        setCameraError('Camera is being used by another app. Please close other apps and try again.')
        setError('Camera is being used by another app. Please close other apps and try again.')
      } else {
        setCameraError(`Camera error: ${err?.message || 'Unknown error'}. Please refresh the page.`)
        setError(`Camera error: ${err?.message || 'Unknown error'}. Please refresh the page.`)
      }
    }
  }

  // BUG FIX 3B: Capture selfie and send to backend
  const captureSelfie = async () => {
    const video = videoRef.current
    if (!video) return

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera not ready. Please wait and try again.')
      return
    }

    if (video.readyState < 2) {
      setError('Camera still loading. Please wait.')
      return
    }

    try {
      setStep('processing')

      streamRef.current?.getTracks().forEach(track => track.stop())
      setCameraReady(false)

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        setError('Browser error. Please refresh.')
        setStep('camera')
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = imageData.data
      let totalBrightness = 0

      for (let i = 0; i < pixels.length; i += 4) {
        totalBrightness += pixels[i] + pixels[i + 1] + pixels[i + 2]
      }

      const avgBrightness = totalBrightness / (pixels.length / 4 * 3)
      console.log('Average brightness:', avgBrightness)

      if (avgBrightness < 10) {
        setStep('camera')
        setError(
          'Camera image is too dark. Please ensure your camera is working and you are in a well-lit area.'
        )
        await startCamera()
        return
      }

      const selfieBase64 = canvas.toDataURL('image/jpeg', 0.92)
      console.log('Selfie size:', selfieBase64.length)

      if (selfieBase64.length < 10000) {
        setStep('camera')
        setError('Selfie quality too low. Please try again.')
        await startCamera()
        return
      }

      const res = await api.post('/api/voter/verify-selfie', {
        selfie_base64: selfieBase64,
      })

      console.log('Response status:', res.status)
      const data = res.data
      console.log('Response data:', data)

      if (data?.verified) {
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
          setError((data?.message || 'Verification failed.') + ' — Please try again in better lighting.')
        }
      }
    } catch (err: any) {
      console.error('Selfie error:', err)
      setAttempts(a => a + 1)
      setStep('instructions')
      setError('Connection failed. Please try again.')
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
            {step === 'camera' && (
            <div className="relative w-full h-[400px] overflow-hidden rounded-[12px] bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover rounded-[12px] bg-black scale-x-[-1]"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current
                      .play()
                      .catch(e => console.error('Play failed:', e))
                    console.log('Video dimensions:', videoRef.current.videoWidth, videoRef.current.videoHeight)
                  }
                }}
                onCanPlay={() => {
                  console.log('Video can play')
                  setCameraReady(true)
                }}
              />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[260px] w-[200px] rounded-full border-3 border-dashed border-amber-400/90" />
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center text-sm font-medium text-white">
                Position your face in the oval
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </ProtectedPage>
  )
}
