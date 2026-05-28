'use client'

import React, { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import api from '../../lib/api'
import ProtectedPage from '../components/ProtectedPage'
import { notify } from '../../lib/notifications'

declare global {
  interface Window {
    faceapi?: any
  }
}

const MODEL_URL = '/models'
const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'

export default function EnrollFace() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!scriptLoaded) {
      return
    }

    const loadModels = async () => {
      setError('')
      try {
        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        setModelsLoaded(true)
      } catch (err) {
        console.error('Face API model load failed', err)
        setError('Unable to initialize face recognition models. Please try again later or contact support.')
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [scriptLoaded])

  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      console.error('Camera error', err)
      setError('Unable to access camera. Please check your permissions and try again.')
      notify.error('Camera access denied')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const enrollFace = async () => {
    if (!window.faceapi || !videoRef.current) {
      setError('Face verification is not ready yet.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const detection = await window.faceapi
        .detectSingleFace(videoRef.current, new window.faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection || !detection.descriptor) {
        setError('No face detected. Please position your face clearly in the frame and try again.')
        return
      }

      const descriptor = Array.from(detection.descriptor)
      await api.post('/api/votes/face-descriptor', { descriptor })
      setSuccess('Face descriptor enrolled successfully. You can now verify and vote.')
      notify.success('Face enrollment complete')
      stopCamera()
      setTimeout(() => router.push('/verify-face'), 1200)
    } catch (err: any) {
      console.error('Enroll error', err)
      setError(err?.response?.data?.detail || err?.message || 'Enrollment failed. Please try again.')
      notify.error('Enrollment failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ProtectedPage>
      <Script src={FACE_API_SCRIPT} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white">Enroll Your Face</h1>
            <p className="mt-2 text-slate-400">Capture your face descriptor now so future voting verification is fast and reliable.</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl">
            {loading ? (
              <div className="py-12 text-center text-slate-300">Loading face recognition models...</div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
                )}
                {success && (
                  <div className="mb-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>
                )}

                <div className="mb-6 rounded-3xl border border-white/10 bg-slate-950 p-5 text-sm text-slate-300">
                  <p className="font-semibold text-white">How enrollment works</p>
                  <p className="mt-3">Use your camera to capture a single clear face image. That image is converted into a secure descriptor and stored for future verification.</p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-3xl border border-white/10 bg-slate-800 p-4">
                    <p className="font-semibold text-white">Ready to enroll?</p>
                    <p className="mt-2 text-sm text-slate-400">Position your face in the center of the frame, avoid strong backlighting, and capture the photo.</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black p-4">
                    <video ref={videoRef} className="h-[360px] w-full rounded-3xl bg-slate-950 object-cover" />
                  </div>

                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                      Start Camera
                    </button>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={enrollFace}
                        disabled={processing}
                        className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {processing ? 'Enrolling…' : 'Capture & Enroll'}
                      </button>
                      <button
                        onClick={stopCamera}
                        type="button"
                        className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                      >
                        Stop Camera
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}
