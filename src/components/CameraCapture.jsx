import { useState, useRef, useCallback, useEffect } from 'react';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
}

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('idle');
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [canRetry, setCanRetry] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const startCamera = useCallback(async () => {
    setError(null);
    setCanRetry(false);
    setMode('loading');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (isMobile()) {
        openNativeCamera();
      } else {
        setError('Camera not supported in this browser. Please try Chrome, Firefox, or Edge, or use Upload Photo.');
        setMode('error');
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode('preview');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        if (isMobile()) {
          openNativeCamera();
        } else {
          setError('Camera access was blocked. Click below to try again, or check your browser camera settings.');
          setCanRetry(true);
          setMode('error');
        }
      } else if (err.name === 'NotFoundError') {
        if (isMobile()) {
          openNativeCamera();
        } else {
          setError('No camera detected on this device. Please use Upload Photo.');
          setMode('error');
        }
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another app. Close other camera apps and try again.');
        setMode('error');
      } else {
        if (isMobile()) {
          openNativeCamera();
        } else {
          setError('Could not start camera. Please try again or use Upload Photo.');
          setMode('error');
        }
      }
    }
  }, [facingMode]);

  const openNativeCamera = useCallback(() => {
    setMode('loading');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopStream();
    setCapturedImage(dataUrl);
    setMode('review');
  }, [stopStream, facingMode]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleAccept = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const handleFallbackFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, or WebP.');
      setMode('error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`);
      setMode('error');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setCapturedImage(base64);
      setError(null);
      setMode('review');
    } catch {
      setError('Failed to process the image. Please try again.');
      setMode('error');
    }
  }, []);

  const handleCancel = useCallback(() => {
    stopStream();
    setCapturedImage(null);
    setMode('idle');
    setError(null);
    setCanRetry(false);
    onCancel();
  }, [stopStream, onCancel]);

  if (mode === 'idle') {
    return (
      <div className="camera-container">
        <div className="camera-header">
          <h4>Take Live Photo</h4>
          <p>Position your face in the frame and take a clear selfie.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={handleFallbackFile}
          style={{ display: 'none' }}
        />
        <div className="camera-actions">
          <button type="button" className="kyc-btn kyc-btn-primary" onClick={startCamera}>
            Open Camera
          </button>
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'loading') {
    return (
      <div className="camera-container">
        <div className="camera-loading">
          <div className="camera-spinner" />
          <p>{isMobile() ? 'Opening camera...' : 'Starting camera...'}</p>
        </div>
        <div className="camera-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handleFallbackFile}
            style={{ display: 'none' }}
          />
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div className="camera-container">
        <div className="camera-header">
          <h4>Camera Unavailable</h4>
          {error && <p className="camera-error-text">{error}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={handleFallbackFile}
          style={{ display: 'none' }}
        />
        <div className="camera-actions">
          {canRetry && (
            <button type="button" className="kyc-btn kyc-btn-primary" onClick={startCamera}>
              Try Again
            </button>
          )}
          {isMobile() && !canRetry && (
            <button type="button" className="kyc-btn kyc-btn-primary" onClick={openNativeCamera}>
              Open Device Camera
            </button>
          )}
          {!canRetry && !isMobile() && (
            <button type="button" className="kyc-btn kyc-btn-primary" onClick={onCancel}>
              Use Upload Photo Instead
            </button>
          )}
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <div className="camera-container">
        <div className="camera-preview-wrap">
          <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
          <div className="camera-overlay">
            <div className="camera-face-guide" />
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        <div className="camera-controls">
          <button type="button" className="camera-cancel-btn" onClick={handleCancel} aria-label="Cancel">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button type="button" className="camera-capture-btn" onClick={capturePhoto} aria-label="Capture photo">
            <div className="camera-capture-inner" />
          </button>
          <button
            type="button"
            className="camera-flip-btn"
            onClick={() => {
              stopStream();
              setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
            }}
            aria-label="Flip camera"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'review' && capturedImage) {
    return (
      <div className="camera-container">
        <div className="camera-header">
          <h4>Review Your Photo</h4>
          <p>Check that your face is clearly visible and the image is not blurry.</p>
        </div>
        <div className="camera-review-wrap">
          <img src={capturedImage} alt="Captured selfie" className="camera-review-img" />
        </div>
        <div className="camera-actions">
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleRetake}>
            Retake
          </button>
          <button type="button" className="kyc-btn kyc-btn-primary" onClick={handleAccept}>
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  return null;
}
