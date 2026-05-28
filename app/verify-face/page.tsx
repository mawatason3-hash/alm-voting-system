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
const THRESHOLD = 0.6
const MAX_ATTEMPTS = 3
const CHECK_INTERVAL_MS = 500

interface Detection {
  descriptor: Float32Array
  landmarks?: any
}

export default function VerifyFace() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!scriptLoaded) {
      return
    }

    const initializeFaceApi = async () => {
      try {
        if (!window.faceapi) {
          console.error('face-api.js not loaded. Please ensure it is included in the HTML.')
          setError('Face verification system not available. Redirecting to contact admin...')
          setTimeout(() => router.push('/verify-face/contact-admin'), 2000)
          return
        }

        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)

        const faceRefRes = await api.get('/api/votes/face-descriptor')
        const refData = faceRefRes.data

        if (refData.descriptor) {
          setReferenceDescriptor(new Float32Array(refData.descriptor))
          setSuccess('Using your enrolled face for verification.')
        } else if (refData.photo_url) {
          try {
            const baseUrl = (api.defaults.baseURL || '').replace(/\/\/+$/, '')
            const photoUrl = refData.photo_url.startsWith('http')
              ? refData.photo_url
              : `${baseUrl}${refData.photo_url}`
            const img = await window.faceapi.fetchImage(photoUrl)
            const detection = await window.faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor()

            if (detection) {
              setReferenceDescriptor(detection.descriptor)
              setPhotoPreview(photoUrl)
              setSuccess('Using your registration photo for verification.')
            } else {
              setError('No face detected in registration photo. Redirecting to contact admin...')
              setTimeout(() => router.push('/verify-face/contact-admin'), 2000)
            }
          } catch (err) {
            console.error('Error extracting face from photo:', err)
            setError('Unable to process registration photo. Redirecting to contact admin...')
            setTimeout(() => router.push('/verify-face/contact-admin'), 2000)
          }
        } else {
          setError('No face reference available. Redirecting to contact admin...')
          setTimeout(() => router.push('/verify-face/contact-admin'), 2000)
        }
      } catch (err) {
        console.error('Error initializing face verification:', err)
        setError('Face verification initialization failed.')
      } finally {
        setLoading(false)
      }
    }

    initializeFaceApi()
  }, [router, scriptLoaded])

  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.')
      notify.error('Camera access denied')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      setCameraActive(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || !referenceDescriptor) {
      setError('Camera or reference not ready.')
      return
    }

    setVerifying(true)
    setError('')

    try {
      if (!window.faceapi) {
        setError('Face API not available')
        return
      }

      // Capture frame from video
      const context = canvasRef.current.getContext('2d')
      if (!context) {
        setError('Unable to access canvas.')
        return
      }

      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

      // Detect face in captured frame
      const detections = await window.faceapi
        .detectAllFaces(canvasRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors()

      if (!detections || detections.length === 0) {
        setError('No face detected. Please position your face clearly in the camera.')
        setAttempts((prev) => prev + 1)
        setVerifying(false)
        return
      }

      if (detections.length > 1) {
        setError('Multiple faces detected. Please ensure only your face is visible.')
        setAttempts((prev) => prev + 1)
        setVerifying(false)
        return
      }

      const capturedDescriptor = detections[0].descriptor

      // Compare descriptors using Euclidean distance
      const distance = computeDistance(referenceDescriptor, capturedDescriptor)
      const threshold = 0.6 // Typical threshold for face-api.js

      if (distance < THRESHOLD) {
        setSuccess('Face verified successfully! Proceeding to ballot...')
        notify.success('Face verified successfully!')
        stopCamera()

        setTimeout(() => {
          router.push('/vote')
        }, 1500)
      } else {
        setAttempts((prev) => {
          const nextAttempts = prev + 1
          if (nextAttempts >= MAX_ATTEMPTS) {
            setError('Face verification failed after several tries. Please contact an administrator for help.')
          } else {
            setError(`Face did not match. Distance: ${distance.toFixed(2)}. Please try again.`)
          }
          return nextAttempts
        })
      }
    } catch (err: any) {
      console.error('Verification error:', err)
      setError('Face verification failed. Please try again.')
      notify.error('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const computeDistance = (arr1: Float32Array, arr2: Float32Array): number => {
    let sum = 0
    for (let i = 0; i < arr1.length; i++) {
      const diff = arr1[i] - arr2[i]
      sum += diff * diff
    }
    return Math.sqrt(sum)
  }

  return (
    <ProtectedPage>
      <Script src={FACE_API_SCRIPT} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className="min-h-[calc(100vh-10rem)] bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white">Face Verification</h1>
            <p className="mt-2 text-slate-400">Verify your identity to access the ballot</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-xl">
            {loading ? (
              <div className="py-12 text-center">
                <p className="text-slate-300">Initializing face verification...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {success}
                  </div>
                )}

                {/* Reference Photo Preview */}
                {photoPreview && !cameraActive && (
                  <div className="mb-6 space-y-3">
                    <p className="text-sm font-medium text-slate-200">Reference Photo</p>
                    <div className="flex justify-center">
                      <img
                        src={photoPreview}
                        alt="Reference"
                        className="h-32 w-32 rounded-2xl border border-slate-700 object-cover"
                      />
                    </div>
                    <p className="text-center text-xs text-slate-400">
                      Your registration photo will be used to verify your identity.
                    </p>
                  </div>
                )}

                {/* Camera Section */}
                {!cameraActive ? (
                  <div className="space-y-4">
                    <p className="text-center text-sm text-slate-300">
                      Please use your camera to verify your face before voting.
                    </p>
                    <button
                      onClick={startCamera}
                      disabled={verifying || attempts >= 3}
                      className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Start Camera
                    </button>
                    {attempts >= 3 && (
                      <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        You have reached the maximum number of verification attempts. Please contact an administrator for help.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-2xl border border-white/10"
                      />
                      <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                        className="hidden"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={captureAndVerify}
                        disabled={verifying || attempts >= 3}
                        className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {verifying ? 'Verifying...' : 'Verify Face'}
                      </button>
                      <button
                        onClick={stopCamera}
                        disabled={verifying}
                        className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Fallback Option */}
                {(!cameraActive || attempts >= 3) && (
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <p className="mb-3 text-center text-sm text-slate-400">
                      Unable to verify your face?
                    </p>
                    <button
                      onClick={() => router.push('/verify-face/contact-admin')}
                      className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                    >
                      Contact Admin for Assistance
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  )
}
