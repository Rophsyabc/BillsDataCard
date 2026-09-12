import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType, CameraDirection } from '@capacitor/camera';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CameraCapture({ onCapture, onCancel, onSwitchToUpload }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState('loading'); // 'loading', 'preview', 'review', 'permission_denied', 'unavailable', 'error'
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)

  const isNative = Capacitor.isNativePlatform();

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn('Error stopping camera stream tracks:', e);
      }
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Launch native camera via @capacitor/camera
  const launchNativeCamera = useCallback(async () => {
    setError(null);
    setMode('loading');

    try {
      const permissions = await Camera.checkPermissions();
      if (permissions.camera === 'denied') {
        const req = await Camera.requestPermissions({ permissions: ['camera'] });
        if (req.camera === 'denied') {
          setError('Camera access was denied. Please allow camera access in your device settings or use Upload Photo instead.');
          setMode('permission_denied');
          return;
        }
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
      });

      if (photo && photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
        setMode('review');
      } else {
        setMode('error');
        setError("We couldn't capture the photo. Please try again.");
      }
    } catch (err) {
      // User cancelled native camera or permission denied
      const errMsg = err?.message || String(err);
      if (errMsg.includes('User cancelled') || errMsg.includes('cancelled')) {
        onCancel();
        return;
      }
      if (errMsg.includes('permission') || errMsg.includes('denied')) {
        setError('Camera permission is required to take your verification photo. Please allow camera access in your device settings or use Upload Photo instead.');
        setMode('permission_denied');
      } else {
        setError('Camera is unavailable on this device. Please try again or use Upload Photo.');
        setMode('unavailable');
      }
    }
  }, [onCancel]);

  // Web & Mobile Browser getUserMedia camera
  const startWebCamera = useCallback(async (selectedFacing = facingMode) => {
    stopStream();
    setError(null);
    setMode('loading');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera is unavailable on this device. Please try again or use Upload Photo.');
      setMode('unavailable');
      return;
    }

    try {
      // Check permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permStatus = await navigator.permissions.query({ name: 'camera' });
          if (permStatus.state === 'denied') {
            setError('Camera access was denied. Please allow camera access in your browser or device settings, or use Upload Photo instead.');
            setMode('permission_denied');
            return;
          }
        } catch {
          // navigator.permissions.query({ name: 'camera' }) not supported on all browsers
        }
      }

      const constraints = {
        video: {
          facingMode: { ideal: selectedFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('video.play() was interrupted or waiting:', playErr);
        }
      }

      setMode('preview');
    } catch (err) {
      console.error('getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission is required to take your verification photo. Please allow camera access in your device settings or use Upload Photo instead.');
        setMode('permission_denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Camera is unavailable on this device. Please try again or use Upload Photo.');
        setMode('unavailable');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is being used by another app. Close other camera apps and try again.');
        setMode('error');
      } else {
        setError("We couldn't start the camera. Please try again or use Upload Photo.");
        setMode('error');
      }
    }
  }, [facingMode, stopStream]);

  // Initial mount: start camera
  useEffect(() => {
    if (isNative) {
      launchNativeCamera();
    } else {
      startWebCamera('user');
    }

    return () => {
      stopStream();
    };
  }, [isNative, launchNativeCamera, startWebCamera, stopStream]);

  // Capture frame from video to canvas
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) {
      setError("We couldn't capture the photo. Please try again.");
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setError("Camera is still initializing. Please wait a moment and try again.");
      return;
    }

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // Mirror horizontally if using front/user camera so selfie matches the preview
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      // Validate base64 image data
      if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) {
        setError('The captured image could not be processed. Please retake the photo.');
        setMode('error');
        return;
      }

      // Check approximate size
      const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
      if (approxBytes > MAX_FILE_SIZE) {
        setError('The captured image is too large. Please retake the photo.');
        setMode('error');
        return;
      }

      // Stop camera stream tracks to release hardware
      stopStream();
      setCapturedImage(dataUrl);
      setError(null);
      setMode('review');
    } catch (e) {
      console.error('Capture error:', e);
      setError("We couldn't capture the photo. Please try again.");
      setMode('error');
    }
  }, [facingMode, stopStream]);

  // Flip between front and back camera
  const handleFlipCamera = useCallback(() => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startWebCamera(nextFacing);
  }, [facingMode, startWebCamera]);

  // Retake photo
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    if (isNative) {
      launchNativeCamera();
    } else {
      startWebCamera(facingMode);
    }
  }, [isNative, facingMode, launchNativeCamera, startWebCamera]);

  // Accept and submit to KYC form
  const handleAccept = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage, 'camera');
    }
  }, [capturedImage, onCapture]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    stopStream();
    setCapturedImage(null);
    setError(null);
    onCancel();
  }, [stopStream, onCancel]);

  // Handle switch to upload
  const handleSwitchToUpload = useCallback(() => {
    stopStream();
    setCapturedImage(null);
    setError(null);
    if (onSwitchToUpload) {
      onSwitchToUpload();
    } else {
      onCancel();
    }
  }, [stopStream, onSwitchToUpload, onCancel]);

  // 1. Loading State
  if (mode === 'loading') {
    return (
      <div className="camera-container" role="region" aria-label="Camera Loading">
        <div className="camera-header">
          <h4>Starting Camera</h4>
          <p>Requesting camera access to take your live selfie...</p>
        </div>
        <div className="camera-loading">
          <div className="camera-spinner" />
          <p>Please allow camera permissions if prompted</p>
        </div>
        <div className="camera-actions">
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 2. Permission Denied State
  if (mode === 'permission_denied') {
    return (
      <div className="camera-container" role="region" aria-label="Camera Permission Denied">
        <div className="camera-header">
          <div className="camera-status-icon camera-status-danger">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l22 22M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <h4>Camera Permission Required</h4>
          <p className="camera-error-text">
            {error || 'Camera access was denied. Please allow camera access in your device settings or use Upload Photo instead.'}
          </p>
        </div>
        <div className="camera-card-info">
          <p>To continue with live verification:</p>
          <ol>
            <li>Check your browser address bar or device settings.</li>
            <li>Enable camera permissions for PayBills.</li>
            <li>Click <strong>Try Again</strong>, or switch to <strong>Upload Photo</strong>.</li>
          </ol>
        </div>
        <div className="camera-actions camera-actions-stacked">
          <button
            type="button"
            className="kyc-btn kyc-btn-primary"
            onClick={() => isNative ? launchNativeCamera() : startWebCamera(facingMode)}
          >
            Allow Camera Access / Try Again
          </button>
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleSwitchToUpload}>
            Use Upload Photo Instead
          </button>
          <button type="button" className="kyc-btn kyc-btn-text" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 3. Camera Unavailable / Error State
  if (mode === 'unavailable' || mode === 'error') {
    return (
      <div className="camera-container" role="region" aria-label="Camera Error">
        <div className="camera-header">
          <div className="camera-status-icon camera-status-warning">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h4>{mode === 'unavailable' ? 'Camera Unavailable' : 'Camera Problem'}</h4>
          <p className="camera-error-text">{error || 'Camera could not be started.'}</p>
        </div>
        <div className="camera-actions camera-actions-stacked">
          <button
            type="button"
            className="kyc-btn kyc-btn-primary"
            onClick={() => isNative ? launchNativeCamera() : startWebCamera(facingMode)}
          >
            Try Again
          </button>
          <button type="button" className="kyc-btn kyc-btn-secondary" onClick={handleSwitchToUpload}>
            Use Upload Photo Instead
          </button>
          <button type="button" className="kyc-btn kyc-btn-text" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 4. Live Camera Preview State
  if (mode === 'preview') {
    return (
      <div className="camera-container" role="region" aria-label="Live Camera Preview">
        <div className="camera-header">
          <h4>Take Live Photo (Selfie)</h4>
          <p>Position your face in the oval frame and look directly at the camera.</p>
        </div>

        <div className="camera-preview-wrap">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`camera-video ${facingMode === 'user' ? 'camera-mirrored' : ''}`}
          />
          <div className="camera-overlay">
            <div className="camera-face-guide">
              <span className="camera-guide-text">Align Face Here</span>
            </div>
          </div>
          <div className="camera-badge">
            <span className="camera-badge-dot" /> Live Camera
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="camera-controls">
          <button
            type="button"
            className="camera-cancel-btn"
            onClick={handleCancel}
            title="Cancel"
            aria-label="Cancel"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            className="camera-capture-btn"
            onClick={capturePhoto}
            title="Capture Photo"
            aria-label="Capture photo"
          >
            <div className="camera-capture-inner" />
          </button>

          <button
            type="button"
            className="camera-flip-btn"
            onClick={handleFlipCamera}
            title="Switch Front / Back Camera"
            aria-label="Flip camera"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        <div className="camera-footer-note">
          <small>Standard selfie photo capture for KYC verification (not biometric liveness check).</small>
        </div>
      </div>
    );
  }

  // 5. Review Captured Photo State
  if (mode === 'review' && capturedImage) {
    return (
      <div className="camera-container" role="region" aria-label="Review Captured Selfie">
        <div className="camera-header">
          <h4>Review Selfie</h4>
          <p>Ensure your face is clearly visible, well-lit, and not blurry.</p>
        </div>

        <div className="camera-review-wrap">
          <img src={capturedImage} alt="Captured live selfie" className="camera-review-img" />
          <div className="camera-badge camera-badge-success">
            &#10003; Selfie Captured
          </div>
        </div>

        <div className="camera-compliance-note">
          <p>
            <strong>Note:</strong> Standard live photo for identity verification. Please confirm this photo clearly depicts your face.
          </p>
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
