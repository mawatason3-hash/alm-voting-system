'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '../../lib/api'
import ProtectedPage from '../components/ProtectedPage'

type VerifyStep = 'loading' | 'ready' | 'camera' | 'processing' | 'success' | 'failed' | 'no-photo' | 'permission-denied' | 'error'

type AdminContact = {
  phone?: string
  whatsapp?: string
}

const MAX_ATTEMPTS = 3

export default function VerifyFace() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [step, setStep] = useState<VerifyStep>('loading')
  const [voterName, setVoterName] = useState('Voter')
  const [voterPhotoUrl, setVoterPhotoUrl] = useState<string | null>(null)
  const [adminContact, setAdminContact] = useState<AdminContact>({})
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [guidance, setGuidance] = useState('Preparing verification...')

  const fetchProfile = async () => {
    const response = await api.get('/api/voter/profile')
    if (response.status === 200) {
      setVoterName(response.data?.full_name || 'Voter')
      const photoUrl = response.data?.photo_url || null
      setVoterPhotoUrl(photoUrl)
      return photoUrl
    }
    return null
  }

  const fetchAdminContact = async () => {
    try {
      const response = await api.get('/api/settings/admin-contact')
      const data = response?.data || {}
      setAdminContact({
        phone: data.admin_phone || data.phone || '',
        whatsapp: data.admin_whatsapp || data.whatsapp || '',
      })
    } catch (err) {
      console.warn('Could not load admin contact:', err)
    }
  }

  const initVerification = async () => {
    setStep('loading')
    setError('')
    setGuidance('Preparing verification...')

    try {
      const [profilePhoto] = await Promise.all([fetchProfile(), fetchAdminContact()])
      if (!profilePhoto) {
        setStep('no-photo')
        return
      }
      setStep('ready')
      setGuidance('Ready when you are. Tap to begin.')
    } catch (err) {
      console.error('Verification initialization failed:', err)
      setError('Identity verification could not start. Please refresh or contact admin.')
      setStep('error')
    }
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      setStep('error')
      return
    }

    try {
      setError('')
      setAttempts(0)
      setGuidance('Position your face in the oval')
      setStep('camera')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        await videoRef.current.play()
        streamRef.current = stream
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      if (err?.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and refresh the page.')
        setStep('permission-denied')
      } else if (err?.name === 'NotFoundError') {
        setError('No camera found on this device. Please use a device with a front camera.')
        setStep('error')
      } else {
        setError('Unable to access camera. Please refresh and try again.')
        setStep('error')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const handleVerificationFailure = (message: string) => {
    setError(message)
    setAttempts((prev) => {
      const next = prev + 1
      if (next >= MAX_ATTEMPTS) {
        stopCamera()
        setStep('failed')
      } else {
        setStep('camera')
      }
      return next
    })
  }

  const captureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready. Please try again.')
      return
    }

    setProcessing(true)
    setError('')
    setStep('processing')

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Unable to capture selfie')
      }

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      stopCamera()

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) {
        throw new Error('Could not generate selfie image.')
      }

      const reader = new FileReader()
      const selfieBase64: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Could not encode selfie image.'))
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const response = await api.post('/api/voter/verify-selfie', {
        selfie_base64: selfieBase64,
      })
      const data = response?.data

      if (data?.verified) {
        setStep('success')
        setTimeout(() => router.push('/vote'), 2000)
        return
      }

      handleVerificationFailure(data?.message || 'Face did not match. Make sure you are in good lighting and looking directly at the camera.')
    } catch (err) {
      console.error('Verification error:', err)
      handleVerificationFailure('Verification service failed. Please try again or contact admin.')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    initVerification()
    return () => stopCamera()
  }, [])

  const renderReadyScreen = () => (
    <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-6 shadow-xl sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-4xl text-amber-300">
          🛡️
        </div>
        <h2 className="text-2xl font-semibold text-white">Identity Verification</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          We compare a live selfie with your registration photo before unlocking the ballot.
        </p>
      </div>

      {voterPhotoUrl ? (
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-950/90">
          <img src={voterPhotoUrl} alt="Registered profile" className="h-56 w-full object-cover" />
        </div>
      ) : null}

      <button
        type="button"
        onClick={startCamera}
        disabled={processing}
        className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? 'Preparing camera…' : 'Open Camera & Take Selfie'}
      </button>

      <p className="mt-4 text-center text-sm text-slate-500">{guidance}</p>
    </div>
  )

  const renderCameraScreen = () => (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-4 shadow-xl">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-700 bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-80 min-h-[280px] w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-52 w-52 rounded-full border-4 shadow-[0_0_0_12px_rgba(255,190,60,0.08)] border-slate-300" />
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-center text-sm text-slate-300">
          <p className="font-semibold text-white">{guidance}</p>
          <p className="mt-2">{attempts < MAX_ATTEMPTS ? `Attempt ${attempts + 1} of ${MAX_ATTEMPTS}` : ''}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={captureSelfie}
        disabled={processing}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? 'Processing...' : 'Take Selfie Now'}
      </button>

      <div className="rounded-[28px] border border-slate-800 bg-[#0b172a] p-4 text-sm text-slate-300">
        {error ? <p className="text-red-300">{error}</p> : <p>Keep your face centered in the oval and avoid strong shadows.</p>}
      </div>
    </div>
  )

  const renderProcessingScreen = () => (
    <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-8 text-center text-slate-200 shadow-xl">
      <div className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
      <h2 className="text-2xl font-semibold text-white">Comparing your selfie with your profile…</h2>
      <p className="mt-3 text-sm text-slate-400">This takes just a moment.</p>
    </div>
  )

  const renderSuccessScreen = () => (
    <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-white shadow-xl">
      <div className="mb-5 text-5xl">✅</div>
      <h2 className="text-2xl font-semibold">Identity Confirmed!</h2>
      <p className="mt-4 text-sm text-slate-100">Welcome, {voterName}. Redirecting to the ballot…</p>
    </div>
  )

  const renderFailedScreen = () => (
    <div className="space-y-5 rounded-[28px] border border-slate-800 bg-[#071421] p-6 shadow-xl">
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
            setStep('ready')
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
        {adminContact.phone ? (
          <a href={`tel:${adminContact.phone}`} className="mt-3 block text-lg font-semibold text-amber-300">
            📞 Call Admin: {adminContact.phone}
          </a>
        ) : null}
        {adminContact.whatsapp ? (
          <a
            href={`https://wa.me/${adminContact.whatsapp.replace(/[^0-9]/g, '')}`}
            className="mt-3 block text-lg font-semibold text-emerald-300"
          >
            💬 WhatsApp Admin
          </a>
        ) : null}
      </div>
    </div>
  )

  const renderNoPhotoScreen = () => (
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-200 shadow-xl">
      <div className="mb-4 text-4xl">📷</div>
      <h2 className="text-2xl font-semibold text-white">No profile photo found</h2>
      <p className="mt-4 text-sm text-slate-400">
        Please contact admin — your account may need to be updated with a profile photo.
      </p>
      {adminContact.phone ? (
        <a href={`tel:${adminContact.phone}`} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300">
          Call Admin: {adminContact.phone}
        </a>
      ) : null}
    </div>
  )

  const renderPermissionDeniedScreen = () => (
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-xl">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-4xl text-amber-300">
        🔒
      </div>
      <h2 className="text-2xl font-semibold text-white">Camera Access Required</h2>
      <p className="mt-4 text-sm text-slate-400">
        The browser blocked camera access. Please allow camera permissions and refresh the page.
      </p>
      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-300">
        <p className="font-semibold text-white">On iPhone Safari:</p>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-slate-400">
          <li>Tap AA in the address bar</li>
          <li>Tap Website Settings</li>
          <li>Set Camera to Allow</li>
          <li>Tap Done, then refresh</li>
        </ol>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        Refresh Page
      </button>
    </div>
  )

  const renderErrorScreen = () => (
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-xl">
      <h2 className="text-2xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-4 text-sm text-slate-400">{error || 'Please try again.'}</p>
      <button
        type="button"
        onClick={() => {
          setError('')
          setAttempts(0)
          setStep('ready')
        }}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        Try Again
      </button>
    </div>
  )

  return (
    <ProtectedPage>
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Identity Verification</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Identity Verification</h1>
            <p className="mt-2 text-slate-400">We compare a live selfie to your registration photo before showing the ballot.</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-xl sm:p-10">
            {step === 'loading' && (
              <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-8 text-center text-slate-200 shadow-xl">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                <h2 className="text-2xl font-semibold text-white">Preparing verification...</h2>
                <p className="mt-3 text-sm text-slate-400">Loading your registration photo and verification tools.</p>
              </div>
            )}
            {step === 'ready' && renderReadyScreen()}
            {step === 'camera' && renderCameraScreen()}
            {step === 'processing' && renderProcessingScreen()}
            {step === 'success' && renderSuccessScreen()}
            {step === 'failed' && renderFailedScreen()}
            {step === 'no-photo' && renderNoPhotoScreen()}
            {step === 'permission-denied' && renderPermissionDeniedScreen()}
            {step === 'error' && renderErrorScreen()}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </ProtectedPage>
  )
}
