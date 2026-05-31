'use client'

import React, { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'
import ProtectedPage from '../../components/ProtectedPage'
import { notify } from '../../../lib/notifications'

declare global {
  interface Window {
    faceapi?: any
  }
}

const MODEL_URL = '/models'
const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace('http://', 'https://')

type Step = 'instructions' | 'camera' | 'permission-denied' | 'no-camera' | 'error' | 'success'

export default function FaceSetup() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsReady, setModelsReady] = useState(false)
  const [step, setStep] = useState<Step>('instructions')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cameraError, setCameraError] = useState('')

  const modelApiUrl = BASE ? `${BASE}/api/votes/face-descriptor` : '/api/votes/face-descriptor'

  const loadModels = async () => {
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
    } catch (err) {
      console.error('Model loading failed:', err)
      setError('AI models failed to load. Please refresh the page.')
    } finally {
      setModelsLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      setError('')
      setCameraError('')
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
        setCameraError('Camera permission denied. Please allow camera access for this site and refresh the page.')
        setStep('permission-denied')
      } else if (err?.name === 'NotFoundError') {
        setCameraError('No camera found on your device. Please use a device with a front camera.')
        setStep('no-camera')
      } else {
        setError('Could not access camera. Please refresh the page and try again.')
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

  const captureFace = async () => {
    if (!window.faceapi || !videoRef.current || !canvasRef.current) {
      setError('Face capture is not ready.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

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
        .detectSingleFace(video, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('No face detected. Make sure your face is inside the oval and the lighting is good.')
        return
      }

      const descriptorArray = Array.from(detection.descriptor as Float32Array)
      await api.post(modelApiUrl, { descriptor: descriptorArray })

      setSuccess('Face recognition is set up! You are ready to vote.')
      notify.success('Face recognition setup complete.')
      setStep('success')
      stopCamera()
    } catch (err: any) {
      console.error('Face capture failed:', err)
      setError(err?.response?.data?.detail || err?.message || 'Unable to capture your face. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (!scriptLoaded) return
    loadModels()

    return () => {
      stopCamera()
    }
  }, [scriptLoaded])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const renderInstructions = () => (
    <div className="rounded-[28px] border border-slate-800 bg-[#08131f] p-6 text-center shadow-lg sm:p-10">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 text-4xl text-amber-300">
        📷
      </div>
      <h2 className="text-2xl font-semibold text-white">Set Up Face Recognition</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">Complete these simple steps before capturing your face.</p>

      <div className="mt-6 space-y-3 text-left text-sm text-slate-200 sm:text-base">
        <p>• Sit in a well-lit area</p>
        <p>• Hold your phone at eye level</p>
        <p>• Look directly at the camera</p>
        <p>• Remove glasses if possible</p>
      </div>

      <button
        type="button"
        onClick={startCamera}
        disabled={!modelsReady || processing}
        className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? 'Starting camera…' : 'Start Camera'}
      </button>

      <p className="mt-4 text-sm text-slate-500">
        {modelsLoading
          ? 'Loading AI models…'
          : modelsReady
          ? 'Ready — tap Start Camera to begin.'
          : 'AI models are not available right now.'}
      </p>
    </div>
  )

  const renderCameraScreen = () => (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-800 bg-[#071421] p-4 shadow-xl sm:p-6">
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
          <p className="font-semibold text-white">Position your face in the oval</p>
          <p className="mt-2">Keep your phone steady and make sure your face is clearly visible.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={captureFace}
        disabled={processing}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? 'Processing your face…' : 'Capture My Face'}
      </button>
    </div>
  )

  const renderPermissionDenied = () => (
    <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-slate-100 shadow-lg">
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
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-lg">
      <div className="mb-4 text-4xl">📷</div>
      <h2 className="text-2xl font-semibold text-white">No camera found on your device</h2>
      <p className="mt-4 text-sm text-slate-400">Please use a device with a front camera to set up face recognition.</p>
    </div>
  )

  const renderError = () => (
    <div className="rounded-[28px] border border-slate-700 bg-[#071421] p-6 text-center text-slate-100 shadow-lg">
      <h2 className="text-2xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-4 text-sm text-slate-400">{error || 'Please try again.'}</p>
      <button
        type="button"
        onClick={() => {
          setStep('instructions')
          setError('')
          setCameraError('')
        }}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        Try Again
      </button>
    </div>
  )

  const renderSuccess = () => (
    <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-white shadow-lg">
      <div className="mb-4 text-5xl">✅</div>
      <h2 className="text-2xl font-semibold">Face recognition is set up!</h2>
      <p className="mt-4 text-sm text-slate-100">You are ready to vote.</p>
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        Back to Dashboard
      </button>
    </div>
  )

  return (
    <ProtectedPage>
      <Script src={FACE_API_SCRIPT} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Face recognition</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Set up face recognition</h1>
            <p className="mt-2 text-slate-400">A simple, gesture-friendly setup flow for mobile and iPhone Safari.</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-xl sm:p-10">
            {step === 'instructions' && renderInstructions()}
            {step === 'camera' && renderCameraScreen()}
            {step === 'permission-denied' && renderPermissionDenied()}
            {step === 'no-camera' && renderNoCamera()}
            {step === 'error' && renderError()}
            {step === 'success' && renderSuccess()}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </ProtectedPage>
  )
}
