'use client'

import React, { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import api from '../../lib/api'
import Protected from '../components/ProtectedPage'
import { notify } from '../../lib/notifications'

declare global {
  interface Window {
    faceapi?: any
  }
}

const MODEL_URL = '/models'
const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace('http://', 'https://')
const THRESHOLD = 0.6
const MAX_ATTEMPTS = 3
const SCAN_INTERVAL_MS = 1000

type ScreenState = 'ready' | 'scanning' | 'success' | 'failed' | 'permission-denied' | 'no-camera' | 'error'

type AdminContact = {
  phone?: string
  whatsapp?: string
}

export default function VerifyFace() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsReady, setModelsReady] = useState(false)
  const [screen, setScreen] = useState<ScreenState>('ready')
  const [scanStatus, setScanStatus] = useState('Ready to start')
  const [attempts, setAttempts] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null)
  const [adminContact, setAdminContact] = useState<AdminContact>({})

  const adminUrl = BASE ? `${BASE}/api/settings/admin-contact` : '/api/settings/admin-contact'
  const descriptorUrl = BASE ? `${BASE}/api/votes/face-descriptor` : '/api/votes/face-descriptor'

  const loadModelsAndReference = async () => {
    try {
      if (!window.faceapi) {
        throw new Error('Face API failed to load')
      }

      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])

      setModelsReady(true)

      const response = await api.get(descriptorUrl)
      const data = response?.data

      if (Array.isArray(data?.descriptor) && data.descriptor.length > 0) {
        setReferenceDescriptor(new Float32Array(data.descriptor))
      } else {
        setError('No enrolled face found. Please contact an administrator for help.')
        setScreen('error')
      }
    } catch (err) {
      console.error('Verification initialization failed:', err)
      setError('Face verification initialization failed. Please refresh the page.')
      setScreen('error')
    } finally {
      setModelsLoading(false)
    }
  }

  const fetchAdminContact = async () => {
    try {
      const response = await api.get(adminUrl)
      const data = response?.data || {}
      setAdminContact({
        phone: data.phone || data.phone_number || '',
        whatsapp: data.whatsapp || data.whatsapp_number || '',
      })
    } catch (err) {
      console.warn('Could not load admin contact:', err)
    }
  }

  const startCamera = async () => {
    try {
      setError('')
      setSuccess('')
      setScanStatus('Scanning your face...')
      setAttempts(0)
      setScreen('scanning')

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
        setError('Camera permission denied. Please allow camera access for this site and refresh the page.')
        setScreen('permission-denied')
      } else if (err?.name === 'NotFoundError') {
        setError('No camera found on your device. Please use a device with a front camera.')
        setScreen('no-camera')
      } else {
        setError('Could not access camera. Please refresh the page and try again.')
        setScreen('error')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const updateScanMessage = (cycle: number) => {
    const messages = [
      'Scanning your face...',
      'Almost there, hold still...',
      'Comparing with your profile...',
    ]
    setScanStatus(messages[Math.min(cycle, messages.length - 1)])
  }

  const compareFace = async () => {
    if (!videoRef.current || !canvasRef.current || !window.faceapi || !referenceDescriptor) {
      return
    }

    if (verifying) {
      return
    }

    setVerifying(true)
    setError('')

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Unable to access canvas')
      }

      canvas.width = 640
      canvas.height = 480
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const detection = await window.faceapi
        .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('No face detected. Please keep your face in view.')
        incrementAttempts()
        return
      }

      const distance = computeDistance(referenceDescriptor, detection.descriptor)
      if (distance < THRESHOLD) {
        setSuccess('Identity Verified! Redirecting to ballot...')
        setScreen('success')
        stopCamera()
        setTimeout(() => router.push('/vote'), 1500)
      } else {
        setError('Face did not match. Please try again.')
        incrementAttempts()
      }
    } catch (err: any) {
      console.error('Verification error:', err)
      setError('Face verification failed. Please try again.')
      incrementAttempts()
    } finally {
      setVerifying(false)
    }
  }

  const computeDistance = (arr1: Float32Array, arr2: Float32Array): number => {
    let sum = 0
    for (let i = 0; i < arr1.length; i += 1) {
      const diff = arr1[i] - arr2[i]
      sum += diff * diff
    }
    return Math.sqrt(sum)
  }

  const incrementAttempts = () => {
    setAttempts((prev) => {
      const next = prev + 1
      if (next >= MAX_ATTEMPTS) {
        setScreen('failed')
        stopCamera()
      }
      return next
    })
  }

  useEffect(() => {
    if (!scriptLoaded) return
    loadModelsAndReference()
    fetchAdminContact()

    return () => {
      stopCamera()
    }
  }, [scriptLoaded])

  useEffect(() => {
    if (screen !== 'scanning' || !videoRef.current || !referenceDescriptor || !window.faceapi) {
      return
    }

    let cycle = 0
    const intervalId = window.setInterval(() => {
      updateScanMessage(cycle)
      compareFace()
      cycle += 1
    }, SCAN_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [screen, referenceDescriptor])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const renderReadyScreen = () => (
    <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-6 shadow-xl sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-4xl text-amber-300">
          🛡️
        </div>
        <h2 className="text-2xl font-semibold text-white">Identity Verification</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">Verify your face to access the ballot.</p>
      </div>

      <div className="space-y-3 rounded-[28px] border border-slate-800 bg-[#0d192b] p-5 text-sm text-slate-200">
        <p className="font-semibold text-white">Checklist</p>
        <p>✓ Good lighting</p>
        <p>✓ Face the camera directly</p>
        <p>✓ Remove glasses if needed</p>
      </div>

      <button
        type="button"
        onClick={startCamera}
        disabled={!modelsReady || !referenceDescriptor}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Start Verification
      </button>

      <p className="mt-4 text-center text-sm text-slate-500">
        {modelsLoading
          ? 'Loading AI models…'
          : modelsReady
          ? referenceDescriptor
            ? 'Ready — tap Start Verification to begin.'
            : 'No face reference found. Please contact admin for help.'
          : 'Face verification is unavailable right now.'}
      </p>
    </div>
  )

  const renderScanningScreen = () => (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-4 shadow-xl">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-700 bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-80 min-h-[280px] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-52 w-52 rounded-full border-4 border-amber-300/80 shadow-[0_0_0_12px_rgba(255,190,60,0.08)]" />
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-center text-sm text-slate-300">
          <p className="font-semibold text-white">{scanStatus}</p>
          <p className="mt-2">{verifying ? 'Verifying face now…' : 'Hold still while we compare with your profile.'}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-800 bg-[#0b172a] p-4 text-sm text-slate-300">
        {error ? <p className="text-red-300">{error}</p> : <p>Scanning will run automatically every second.</p>}
      </div>
    </div>
  )

  const renderSuccessScreen = () => (
    <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-white shadow-xl">
      <div className="mb-5 text-5xl">✅</div>
      <h2 className="text-2xl font-semibold">Identity Verified!</h2>
      <p className="mt-4 text-sm text-slate-100">Redirecting to ballot...</p>
    </div>
  )

  const renderFailedScreen = () => (
    <div className="space-y-5 rounded-[28px] border border-slate-800 bg-[#071421] p-6 shadow-xl">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-4xl text-red-300">
          ❌
        </div>
        <h2 className="text-2xl font-semibold text-white">Verification failed</h2>
        <p className="mt-3 text-sm text-slate-400">We tried {attempts} times. Choose one of the options below.</p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => {
            setError('')
            setSuccess('')
            setAttempts(0)
            setScreen('ready')
          }}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Try Again
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
        <p className="font-semibold text-white">Admin contact</p>
        {adminContact.phone ? (
          <a href={`tel:${adminContact.phone}`} className="mt-3 block text-lg font-semibold text-amber-300">
            📞 Call Admin
          </a>
        ) : null}
        {adminContact.whatsapp ? (
          <a href={`https://wa.me/${adminContact.whatsapp.replace(/[^0-9]/g, '')}`} className="mt-3 block text-lg font-semibold text-emerald-300">
            💬 WhatsApp Admin
          </a>
        ) : null}
      </div>
    </div>
  )

  const renderPermissionDenied = () => (
    <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-slate-100 shadow-xl">
      <div className="mb-4 text-center text-4xl">🔒</div>
      <h2 className="text-2xl font-semibold text-white">Camera Permission Required</h2>
      <p className="mt-4 text-sm text-slate-200">On iPhone Safari:</p>
      <ol className="mt-3 space-y-2 text-sm text-slate-200">
        <li>1. Tap AA in the address bar</li>
        <li>2. Tap Website Settings</li>
        <li>3. Set Camera to Allow</li>
        <li>4. Tap Done and refresh</li>
      </ol>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Refresh Page
      </button>
    </div>
  )

  const renderNoCamera = () => (
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-xl">
      <div className="mb-4 text-4xl">📷</div>
      <h2 className="text-2xl font-semibold text-white">No camera found on your device</h2>
      <p className="mt-4 text-sm text-slate-400">Please use a device with a front camera.</p>
    </div>
  )

  const renderError = () => (
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-xl">
      <h2 className="text-2xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-4 text-sm text-slate-400">{error || 'Please try again.'}</p>
      <button
        type="button"
        onClick={() => {
          setError('')
          setSuccess('')
          setAttempts(0)
          setScreen('ready')
        }}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        Try Again
      </button>
    </div>
  )

  return (
    <Protected>
      <Script src={FACE_API_SCRIPT} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Identity check</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Identity Verification</h1>
            <p className="mt-2 text-slate-400">A simple mobile-first verification flow for Safari and all devices.</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-xl sm:p-10">
            {screen === 'ready' && renderReadyScreen()}
            {screen === 'scanning' && renderScanningScreen()}
            {screen === 'success' && renderSuccessScreen()}
            {screen === 'failed' && renderFailedScreen()}
            {screen === 'permission-denied' && renderPermissionDenied()}
            {screen === 'no-camera' && renderNoCamera()}
            {screen === 'error' && renderError()}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </Protected>
  )
}
