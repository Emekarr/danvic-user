'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, FormMessage, Input } from '@danvic/ui'
import { ArrowLeft, Camera, CheckCircle2, ScanLine, Search, Square } from 'lucide-react'

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}

type VerificationMethod = 'number' | 'camera' | null

export function CertificateVerifier() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [method, setMethod] = useState<VerificationMethod>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const isCertificateComplete = certificateNumber.length === 19

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play().catch(() => undefined)
  }, [scanning])

  useEffect(() => {
    if (!scanning || !videoRef.current) return
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector
    if (!Detector) return
    const detector = new Detector({ formats: ['qr_code'] })
    const timer = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return
      const result = await detector.detect(videoRef.current).catch(() => [])
      const value = result[0]?.rawValue
      if (!value) return
      const number = extractCertificateNumber(value)
      if (!number) {
        setError('That QR code is not a DANVIC certificate.')
        return
      }
      stop()
      router.push(`/certificates/${encodeURIComponent(number)}`)
    }, 500)
    return () => window.clearInterval(timer)
  }, [router, scanning])

  const start = async () => {
    setError('')
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector
    if (!Detector) {
      setError(
        'QR scanning is not supported by this browser. Enter the certificate number instead.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setScanning(true)
    } catch {
      setError('Camera access was unavailable. Enter the certificate number instead.')
      stop()
    }
  }

  const chooseNumber = () => {
    stop()
    setError('')
    setMethod('number')
  }

  const chooseCamera = () => {
    stop()
    setError('')
    setMethod('camera')
  }

  const chooseAnotherMethod = () => {
    stop()
    setError('')
    setMethod(null)
  }

  return (
    <div className="lr-verify">
      <header className="lr-verify-head">
        <span className="lr-verify-kicker">Choose a verification method</span>
        <h2>Confirm a certificate in seconds</h2>
        <p>
          Enter the certificate ID, or scan the QR code on the certificate. Both options open the
          same verified record.
        </p>
      </header>

      <div className="lr-verify-methods" role="tablist" aria-label="Verification method">
        <button
          type="button"
          className="lr-verify-method"
          data-selected={method === 'number' || undefined}
          role="tab"
          aria-selected={method === 'number'}
          aria-controls="certificate-id-panel"
          onClick={chooseNumber}
        >
          <span className="lr-verify-method-icon">
            <Search aria-hidden="true" />
          </span>
          <span className="lr-verify-method-copy">
            <strong>Enter certificate ID</strong>
            <small>Use the 16-digit number printed on the certificate.</small>
          </span>
          {method === 'number' ? <CheckCircle2 aria-label="Selected" /> : null}
        </button>
        <button
          type="button"
          className="lr-verify-method"
          data-selected={method === 'camera' || undefined}
          role="tab"
          aria-selected={method === 'camera'}
          aria-controls="certificate-qr-panel"
          onClick={chooseCamera}
        >
          <span className="lr-verify-method-icon">
            <ScanLine aria-hidden="true" />
          </span>
          <span className="lr-verify-method-copy">
            <strong>Scan QR code</strong>
            <small>Use your device camera to read the certificate QR code.</small>
          </span>
          {method === 'camera' ? <CheckCircle2 aria-label="Selected" /> : null}
        </button>
      </div>

      {method === 'number' ? (
        <section className="lr-verify-panel" id="certificate-id-panel" role="tabpanel">
          <div className="lr-verify-panel-heading">
            <span className="lr-verify-panel-icon">
              <Search aria-hidden="true" />
            </span>
            <div>
              <h3>Enter the certificate ID</h3>
              <p>Type the 16-digit ID exactly as it appears at the bottom of the certificate.</p>
            </div>
            <button type="button" className="lr-certificate-back" onClick={chooseAnotherMethod}>
              <ArrowLeft aria-hidden="true" /> Change
            </button>
          </div>
          <form
            className="lr-verify-form"
            onSubmit={(event) => {
              event.preventDefault()
              setError('')
              const number = extractCertificateNumber(certificateNumber)
              if (!number) {
                setError('Enter a valid DANVIC certificate ID.')
                return
              }
              router.push(`/certificates/${encodeURIComponent(number)}`)
            }}
          >
            <Field label="Certificate ID" required>
              <Input
                name="certificateNumber"
                value={certificateNumber}
                onChange={(event) =>
                  setCertificateNumber(formatCertificateNumber(event.target.value))
                }
                placeholder="1234-5678-9012-3456"
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}"
                maxLength={19}
                required
              />
            </Field>
            <Button disabled={!isCertificateComplete}>
              <Search aria-hidden="true" /> Verify certificate
            </Button>
          </form>
        </section>
      ) : null}

      {method === 'camera' ? (
        <section className="lr-verify-panel" id="certificate-qr-panel" role="tabpanel">
          <div className="lr-verify-panel-heading">
            <span className="lr-verify-panel-icon">
              <ScanLine aria-hidden="true" />
            </span>
            <div>
              <h3>Scan the QR code</h3>
              <p>Position the code inside the frame. We’ll open the certificate when it is found.</p>
            </div>
            <button type="button" className="lr-certificate-back" onClick={chooseAnotherMethod}>
              <ArrowLeft aria-hidden="true" /> Change
            </button>
          </div>
          <div className="lr-certificate-camera" data-active={scanning || undefined}>
            <div className="cert-camera" data-active={scanning || undefined}>
              <video ref={videoRef} muted playsInline aria-label="Certificate QR scanner camera" />
              {!scanning ? <Camera aria-hidden="true" /> : <span className="cert-scan-frame" />}
            </div>
            <p>{scanning ? 'Looking for a DANVIC certificate QR code…' : 'Camera stays off until you start scanning.'}</p>
          </div>
          <Button
            type="button"
            variant={scanning ? 'secondary' : 'primary'}
            onClick={() => (scanning ? stop() : void start())}
          >
            {scanning ? <Square aria-hidden="true" /> : <Camera aria-hidden="true" />}
            {scanning ? 'Stop scanner' : 'Start scanner'}
          </Button>
        </section>
      ) : null}

      <div className="cert-verify-message">
        <FormMessage>{error}</FormMessage>
      </div>
    </div>
  )
}

const extractCertificateNumber = (value: string): string | null => {
  const match = decodeURIComponent(value).match(/\d{4}-\d{4}-\d{4}-\d{4}/)
  return match?.[0] ?? null
}

const formatCertificateNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1-')
}
