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

export default function FaceSetup() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasDescriptor, setHasDescriptor] = useState<boolean | null>(null)

  const startCamera = async () => {
    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        streamRef.current = stream
        setCameraActive(true)
      }
    } catch (err: any) {
      const error = err as Error
      if (error.name === 'NotAllowedError') {
        setCameraError(
          'Camera permission denied. Please go to your browser settings, allow camera access for this site, then refresh the page.'
        )
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on your device. Please use a device with a camera.')
      } else {
        setCameraError('Could not access camera. Please refresh the page and try again.')
      }
      console.error('Camera error:', error)
    }
  }

  const loadModels = async () => {
    try {
      if (!window.faceapi) {
        throw new Error('Face API failed to load')
      }

      await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
      await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

      const response = await api.get('/api/votes/face-descriptor')
      const descriptor = response?.data?.descriptor
      setHasDescriptor(Array.isArray(descriptor) && descriptor.length > 0)
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setHasDescriptor(false)
      } else {
        console.warn('Face setup initialization failed', err)
        setError('Face setup is unavailable at the moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-start camera and load models on page load
  useEffect(() => {
    if (!scriptLoaded) return

    const initialize = async () => {
      await loadModels()
      await startCamera()
    }

    initialize()
  }, [scriptLoaded])

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      setCameraActive(false)
    }
  }

  const captureDescriptor = async () => {
    if (!window.faceapi || !videoRef.current || !canvasRef.current) {
      setError('Face capture is not ready.')
      return null
    }

    const context = canvasRef.current.getContext('2d')
    if (!context) {
      setError('Unable to access canvas.')
      return null
    }

    canvasRef.current.width = 640
    canvasRef.current.height = 480
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

    const detection = await window.faceapi
      .detectSingleFace(canvasRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) {
      setError('No face detected. Please center your face in the camera.')
      return null
    }

    return detection.descriptor
  }

  const saveDescriptor = async () => {
    if (!cameraActive) {
      setError('Camera must be running to capture face.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const descriptor = await captureDescriptor()
      if (!descriptor) {
        return
      }

      const descriptorArray = Array.from(descriptor)
      await api.post('/api/votes/face-descriptor', { descriptor: descriptorArray })
      setSuccess('Face descriptor saved successfully. You can now verify your identity for voting.')
      setHasDescriptor(true)
      notify.success('Face verification setup complete.')
      stopCamera()
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      console.error('Error saving face descriptor:', err)
      let message = 'Failed to save face descriptor.'
      if (err?.response?.data?.detail) message = err.response.data.detail
      else if (err?.message) message = err.message
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedPage>
      <Script src={FACE_API_SCRIPT} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Member security</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Set up face recognition</h1>
            <p className="mt-2 text-slate-400">Capture your face so you can verify your identity at the ballot.</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 shadow-xl">
            {loading ? (
              <div className="py-10 text-center text-slate-300">Loading face recognition system…</div>
            ) : (
              <>
                {error && <div className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
                {success && <div className="mb-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

                {cameraError && (
                  <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-500/10 p-5">
                    <p className="text-sm font-semibold text-red-200">📷 Camera Access Required</p>
                    <p className="mt-2 text-sm text-red-100">To set up face recognition, please:</p>
                    <ol className="mt-3 space-y-2 text-sm text-red-100">
                      <li>1. Click the camera icon in your browser address bar</li>
                      <li>2. Select "Allow" for camera</li>
                      <li>3. Click "Refresh Page" below to try again</li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-4 rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      Refresh Page
                    </button>
                  </div>
                )}

                <div className="mb-6 rounded-3xl bg-[#09131f] p-5">
                  <p className="text-sm font-semibold text-white">Face recognition status</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {hasDescriptor === null
                      ? 'Loading your current enrollment status.'
                      : hasDescriptor
                      ? 'You already have a face descriptor stored. You may update it anytime.'
                      : 'No face descriptor is stored for your account yet.'}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.7fr_0.7fr]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-5">
                      <p className="text-sm font-semibold text-white">Camera preview</p>
                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700 bg-slate-950">
                        <video ref={videoRef} autoPlay playsInline className="h-72 w-full bg-slate-900 object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <p className="mt-3 text-sm text-slate-400">
                        {cameraActive ? 'Camera is running. Position your face in the frame.' : 'Waiting for camera access…'}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-[#f8f9fa] p-5 text-slate-900">
                      <p className="text-sm font-semibold">Instructions</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6">
                        <li>• Ensure your face is centered and well lit.</li>
                        <li>• Remove hats, sunglasses, or masks.</li>
                        <li>• Keep a neutral expression.</li>
                        <li>• Look directly at the camera.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-5">
                      <p className="text-sm font-semibold text-white">Actions</p>
                      <div className="mt-5 space-y-3">
                        <button
                          type="button"
                          onClick={saveDescriptor}
                          disabled={!cameraActive || saving || cameraError !== ''}
                          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {saving ? 'Saving...' : hasDescriptor ? 'Update face descriptor' : 'Capture face'}
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          disabled={!cameraActive}
                          className="w-full rounded-2xl border border-slate-700 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Stop camera
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-700 bg-[#0f172a] p-5 text-sm text-slate-400">
                      <p className="font-semibold text-white">Need help?</p>
                      <p className="mt-3">If face setup fails, contact an admin for manual identity verification and ballot access.</p>
                      <button
                        type="button"
                        onClick={() => router.push('/verify-face/contact-admin')}
                        className="mt-4 inline-flex rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Contact Admin
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}

