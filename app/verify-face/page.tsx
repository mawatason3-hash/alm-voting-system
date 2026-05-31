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
const THRESHOLD = 0.6
const MAX_ATTEMPTS = 3
const CHECK_INTERVAL_MS = 500

interface GuidanceMessage {
  message: string
  color: 'red' | 'amber' | 'emerald'
  icon: string
}

interface Detection {
  descriptor: Float32Array
  landmarks?: any
}

const getGuidanceMessage = (detection: any, videoEl: HTMLVideoElement): GuidanceMessage => {
  if (!detection) {
    return {
      message: 'No face detected — position your face in the circle',
      color: 'red',
      icon: '⚠'
    }
  }

  const box = detection.detection.box
  const videoWidth = videoEl.videoWidth || 1
  const videoHeight = videoEl.videoHeight || 1
  const score = detection.detection.score

  if (box.width < videoWidth * 0.2) {
    return {
      message: 'Move closer to the camera',
      color: 'amber',
      icon: '🔍'
    }
  }

  if (box.width > videoWidth * 0.8) {
    return {
      message: 'Move a bit further from the camera',
      color: 'amber',
      icon: '↔'
    }
  }

  const faceCenterX = box.x + box.width / 2
  if (faceCenterX < videoWidth * 0.3) {
    return {
      message: 'Move your face to the right',
      color: 'amber',
      icon: '→'
    }
  }

  if (faceCenterX > videoWidth * 0.7) {
    return {
      message: 'Move your face to the left',
      color: 'amber',
      icon: '←'
    }
  }

  const faceCenterY = box.y + box.height / 2
  if (faceCenterY < videoHeight * 0.3) {
    return {
      message: 'Lower your face slightly',
      color: 'amber',
      icon: '↓'
    }
  }

  if (faceCenterY > videoHeight * 0.7) {
    return {
      message: 'Raise your face slightly',
      color: 'amber',
      icon: '↑'
    }
  }

  if (score < 0.7) {
    return {
      message: 'Poor lighting — move to a brighter area',
      color: 'amber',
      icon: '💡'
    }
  }

  return {
    message: 'Good position! Hold still for verification.',
    color: 'emerald',
    icon: '✅'
  }
}

export default function VerifyFace() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [referenceDescriptor, setReferenceDescriptor] = useState<Float32Array | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [guidance, setGuidance] = useState<GuidanceMessage>({
    message: 'No face detected — position your face in the circle',
    color: 'red',
    icon: '⚠'
  })

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
          const baseUrl = (api.defaults.baseURL || '').replace(/\/\/+/g, '')
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

  useEffect(() => {
    if (!scriptLoaded) return

    const initialize = async () => {
      await loadModels()
      await startCamera()
    }

    initialize()
  }, [scriptLoaded])

  useEffect(() => {
    if (!cameraActive || !scriptLoaded || !videoRef.current || !window.faceapi) {
      return
    }

    const videoEl = videoRef.current
    const intervalId = window.setInterval(async () => {
      try {
        if (!videoEl || videoEl.paused || videoEl.ended) {
          return
        }

        const detection = await window.faceapi
          .detectSingleFace(videoEl)
          .withFaceLandmarks()

        setGuidance(getGuidanceMessage(detection, videoEl))
      } catch (err) {
        setGuidance({
          message: 'No face detected — position your face in the circle',
          color: 'red',
          icon: '⚠'
        })
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [cameraActive, scriptLoaded])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
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

      const context = canvasRef.current.getContext('2d')
      if (!context) {
        setError('Unable to access canvas.')
        return
      }

      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)

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
      const distance = computeDistance(referenceDescriptor, capturedDescriptor)

      if (distance < THRESHOLD) {
        setSuccess('Face verified successfully! Proceeding to ballot...')
        notify.success('Face verified successfully!')
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          setCameraActive(false)
        }

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

  const guidanceClass =
    guidance.color === 'red'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : guidance.color === 'amber'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'

  return (
    <Protected>
      <div>Verify Face minimal</div>
    </Protected>
  )
}
