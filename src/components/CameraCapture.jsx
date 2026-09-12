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

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState('idle');
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');

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
    setMode('loading');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMode('fallback');
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
        setError('Camera permission was denied. Please allow camera access in your browser/device settings, or use Upload Photo instead.');
        setMode('fallback');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device. Please use Upload Photo instead.');
        setMode('fallback');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other camera apps and try again.');
        setMode('fallback');
      } else {
        setError('Could not start camera. Please try again or use Upload Photo.');
        setMode('fallback');
      }
    }
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopStream();
    setCapturedImage(dataUrl);
    setMode('review');
  }, [stopStream]);

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
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setCapturedImage(base64);
      setMode('review');
    } catch {
      setError('Failed to process the image. Please try again.');
    }
  }, []);

  const handleCancel = useCallback(() => {
    stopStream();
    setCapturedImage(null);
    setMode('idle');
    setError(null);
    onCancel();
  }, [stopStream, onCancel]);

  if (mode === 'idle') {
    return (
      <div className="camera-container">
        <div className="camera-header">
          <h4>Take Live Photo</h4>
          <p>Position your face in the frame and take a clear selfie.</p>
        </div>
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
          <p>Starting camera...</p>
        </div>
        <div className="camera-actions">
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'fallback') {
    return (
      <div className="camera-container">
        <div className="camera-header">
          <h4>Take Live Photo</h4>
          {error && <p className="camera-error-text">{error}</p>}
          {!error && <p>Your browser camera is not available. Use the button below to open your device camera.</p>}
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
          <button type="button" className="kyc-btn kyc-btn-primary" onClick={() => fileInputRef.current?.click()}>
            Open Device Camera
          </button>
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
