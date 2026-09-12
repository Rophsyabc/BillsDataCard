import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { KycStatusBadge } from './ProfileAvatar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const STEPS = {
  PERSONAL: 'personal',
  DOCUMENT: 'document',
  ADDITIONAL: 'additional',
  REVIEW: 'review',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function validateFile(file) {
  if (!file) return { valid: false, message: 'No file selected' };
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, message: 'Invalid file type. Please upload JPEG, PNG, or WebP.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.` };
  }
  return { valid: true };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function KycVerification({ isOpen, onClose, initialTab }) {
  const { user, token, updateUser } = useApp();
  const [kycStatus, setKycStatus] = useState(null);
  const [currentStep, setCurrentStep] = useState(STEPS.PERSONAL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [nameOnNin, setNameOnNin] = useState(user?.name || '');
  const [ninNumber, setNinNumber] = useState('');
  const [ninSlipImage, setNinSlipImage] = useState(null);
  const [ninSlipPreview, setNinSlipPreview] = useState(null);
  const [livePhoto, setLivePhoto] = useState(null);
  const [livePhotoPreview, setLivePhotoPreview] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [uploadingNin, setUploadingNin] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const ninInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchKycStatus();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (initialTab === 'kyc') {
      setCurrentStep(STEPS.DOCUMENT);
    }
  }, [initialTab]);

  const fetchKycStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setKycStatus(data.data);
        setPhoneVerified(data.data.phoneVerified);
        if (data.data.phone) setPhone(data.data.phone);
      }
    } catch (e) {
      console.error('Failed to fetch KYC status:', e);
    }
  };

  const handleFileSelect = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setResult({ success: false, message: validation.message });
      return;
    }

    if (type === 'nin') {
      setUploadingNin(true);
    } else {
      setUploadingPhoto(true);
    }

    try {
      const base64 = await fileToBase64(file);
      if (type === 'nin') {
        setNinSlipImage(base64);
        setNinSlipPreview(base64);
      } else {
        setLivePhoto(base64);
        setLivePhotoPreview(base64);
      }
      setResult(null);
    } catch {
      setResult({ success: false, message: 'Failed to process file. Please try again.' });
    } finally {
      setUploadingNin(false);
      setUploadingPhoto(false);
    }
  };

  const handleCaptureLivePhoto = () => {
    if (photoInputRef.current) {
      photoInputRef.current.removeAttribute('capture');
      photoInputRef.current.setAttribute('capture', 'user');
      photoInputRef.current.click();
    }
  };

  const handleRemoveDocument = (type) => {
    if (type === 'nin') {
      setNinSlipImage(null);
      setNinSlipPreview(null);
      if (ninInputRef.current) ninInputRef.current.value = '';
    } else {
      setLivePhoto(null);
      setLivePhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!phone) {
      setResult({ success: false, message: 'Enter your phone number first' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) setPhoneSent(true);
    } catch {
      setResult({ success: false, message: 'Failed to send OTP' });
    }
    setLoading(false);
  };

  const handleVerifyPhone = async () => {
    if (!/^\d{6}$/.test(phoneOtp)) {
      setResult({ success: false, message: 'Enter 6-digit OTP' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone, otp: phoneOtp }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setPhoneVerified(true);
        fetchKycStatus();
      }
    } catch {
      setResult({ success: false, message: 'Failed to verify phone' });
    }
    setLoading(false);
  };

  const handleSubmitKyc = async () => {
    if (!/^\d{11}$/.test(ninNumber)) {
      setResult({ success: false, message: 'NIN must be 11 digits' });
      return;
    }
    if (!nameOnNin.trim()) {
      setResult({ success: false, message: 'Enter your name as it appears on NIN' });
      return;
    }
    if (!ninSlipImage) {
      setResult({ success: false, message: 'Upload your NIN slip' });
      return;
    }
    if (!livePhoto) {
      setResult({ success: false, message: 'Upload or capture your live photo' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ninNumber,
          nameOnNin: nameOnNin.trim(),
          ninSlipImage,
          livePhoto,
          additionalInfo,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        fetchKycStatus();
        updateUser({ kycStatus: 'pending' });
        setCurrentStep(STEPS.REVIEW);
      }
    } catch {
      setResult({ success: false, message: 'Failed to submit KYC. Please try again.' });
    }
    setLoading(false);
  };

  const handleNextStep = () => {
    setResult(null);
    const steps = Object.values(STEPS);
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    }
  };

  const handlePrevStep = () => {
    setResult(null);
    const steps = Object.values(STEPS);
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
    }
  };

  if (!isOpen) return null;

  const status = kycStatus?.status || 'none';
  const isAlreadySubmitted = status === 'pending' || status === 'verified';
  const canProceedToSubmit = ninSlipImage && livePhoto && ninNumber.length === 11 && nameOnNin.trim();

  return (
    <div className="kyc-overlay" onClick={onClose}>
      <div className="kyc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kyc-modal-header">
          <div>
            <h2>Identity Verification</h2>
            <p>Complete your KYC to unlock all features</p>
          </div>
          <button className="kyc-close-btn" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {kycStatus && (
          <div className="kyc-status-banner">
            <KycStatusBadge status={status} />
            {kycStatus.latestJob?.adminNote && status !== 'verified' && (
              <p className="kyc-admin-note">{kycStatus.latestJob.adminNote}</p>
            )}
          </div>
        )}

        {isAlreadySubmitted ? (
          <div className="kyc-submitted-state">
            {status === 'pending' && (
              <div className="kyc-state-card kyc-state-pending">
                <div className="kyc-state-icon">&#9203;</div>
                <h3>Verification Pending</h3>
                <p>Your documents have been submitted and are currently being reviewed. This usually takes 24-48 hours.</p>
              </div>
            )}
            {status === 'verified' && (
              <div className="kyc-state-card kyc-state-verified">
                <div className="kyc-state-icon">&#10003;</div>
                <h3>Identity Verified</h3>
                <p>Your identity has been verified. You have full access to all features.</p>
              </div>
            )}
            <button className="kyc-btn kyc-btn-secondary" onClick={onClose}>Close</button>
          </div>
        ) : status === 'resubmission_required' ? (
          <div className="kyc-resubmit-state">
            <div className="kyc-state-card kyc-state-resubmit">
              <div className="kyc-state-icon">&#9888;</div>
              <h3>Resubmission Required</h3>
              <p>{kycStatus?.latestJob?.adminNote || 'Please correct the requested information and submit your verification again.'}</p>
            </div>
            <button className="kyc-btn kyc-btn-primary" onClick={() => { setCurrentStep(STEPS.DOCUMENT); setResult(null); }}>
              Resubmit Documents
            </button>
          </div>
        ) : (
          <div className="kyc-flow">
            <div className="kyc-steps-indicator">
              {Object.values(STEPS).filter(s => s !== STEPS.REVIEW).map((step, idx) => (
                <div
                  key={step}
                  className={`kyc-step-dot ${currentStep === step ? 'active' : ''} ${
                    Object.values(STEPS).filter(s => s !== STEPS.REVIEW).indexOf(currentStep) > idx ? 'completed' : ''
                  }`}
                >
                  <span>{idx + 1}</span>
                </div>
              ))}
            </div>

            {result && (
              <div className={`kyc-alert ${result.success ? 'kyc-alert-success' : 'kyc-alert-error'}`}>
                {result.message}
                <button onClick={() => setResult(null)}>&times;</button>
              </div>
            )}

            {currentStep === STEPS.PERSONAL && (
              <div className="kyc-step-content">
                <h3>Personal Information</h3>
                <p className="kyc-step-desc">Verify your phone number and confirm your details.</p>

                <div className="kyc-form-group">
                  <label>Full Name</label>
                  <input type="text" value={user?.name || ''} disabled style={{ opacity: 0.7 }} />
                  <small>This is the name registered on your account.</small>
                </div>

                <div className="kyc-form-group">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.7 }} />
                  <small>{user?.emailVerified ? 'Verified' : 'Not verified'}</small>
                </div>

                {!phoneVerified && (
                  <div className="kyc-phone-section">
                    <h4>Phone Verification</h4>
                    <div className="kyc-form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08012345678"
                        maxLength={11}
                      />
                    </div>
                    {!phoneSent ? (
                      <button
                        className="kyc-btn kyc-btn-primary"
                        onClick={handleSendPhoneOtp}
                        disabled={loading || !phone || phone.length !== 11}
                      >
                        {loading ? 'Sending...' : 'Send OTP'}
                      </button>
                    ) : (
                      <div>
                        <div className="kyc-form-group">
                          <label>Enter OTP</label>
                          <input
                            type="text"
                            value={phoneOtp}
                            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit code"
                            maxLength={6}
                          />
                        </div>
                        <button
                          className="kyc-btn kyc-btn-primary"
                          onClick={handleVerifyPhone}
                          disabled={loading || phoneOtp.length !== 6}
                        >
                          {loading ? 'Verifying...' : 'Verify Phone'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {phoneVerified && (
                  <div className="kyc-verified-badge">
                    <span>&#10003;</span> Phone verified
                  </div>
                )}

                <div className="kyc-step-actions">
                  <button className="kyc-btn kyc-btn-secondary" onClick={onClose}>Cancel</button>
                  <button className="kyc-btn kyc-btn-primary" onClick={handleNextStep}>Next</button>
                </div>
              </div>
            )}

            {currentStep === STEPS.DOCUMENT && (
              <div className="kyc-step-content">
                <h3>Upload Documents</h3>
                <p className="kyc-step-desc">Upload your NIN slip and a live photo for verification.</p>

                <div className="kyc-form-group">
                  <label>NIN Number</label>
                  <input
                    type="text"
                    value={ninNumber}
                    onChange={(e) => setNinNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="11-digit NIN"
                    maxLength={11}
                    style={{ fontFamily: 'monospace', letterSpacing: '2px' }}
                  />
                </div>

                <div className="kyc-form-group">
                  <label>Name on NIN (must match signup name)</label>
                  <input
                    type="text"
                    value={nameOnNin}
                    onChange={(e) => setNameOnNin(e.target.value)}
                    placeholder="Full name as on NIN slip"
                  />
                </div>

                <div className="kyc-form-group">
                  <label>NIN Slip Photo</label>
                  <div className="kyc-upload-area">
                    <input
                      ref={ninInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileSelect(e, 'nin')}
                      style={{ display: 'none' }}
                    />
                    {ninSlipPreview ? (
                      <div className="kyc-upload-preview">
                        <img src={ninSlipPreview} alt="NIN Slip" />
                        <div className="kyc-upload-actions">
                          <button type="button" className="kyc-btn-icon" onClick={() => ninInputRef.current?.click()}>
                            Replace
                          </button>
                          <button type="button" className="kyc-btn-icon kyc-btn-danger" onClick={() => handleRemoveDocument('nin')}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="kyc-upload-trigger"
                        onClick={() => ninInputRef.current?.click()}
                        disabled={uploadingNin}
                      >
                        {uploadingNin ? (
                          <span>Processing...</span>
                        ) : (
                          <>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span>Upload NIN Slip</span>
                            <small>JPEG, PNG, or WebP (max 5MB)</small>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="kyc-form-group">
                  <label>Live Photo (selfie)</label>
                  <div className="kyc-upload-area">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                      onChange={(e) => handleFileSelect(e, 'photo')}
                      style={{ display: 'none' }}
                    />
                    {livePhotoPreview ? (
                      <div className="kyc-upload-preview kyc-upload-preview-round">
                        <img src={livePhotoPreview} alt="Live Photo" />
                        <div className="kyc-upload-actions">
                          <button type="button" className="kyc-btn-icon" onClick={() => photoInputRef.current?.click()}>
                            Replace
                          </button>
                          <button type="button" className="kyc-btn-icon kyc-btn-danger" onClick={() => handleRemoveDocument('photo')}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="kyc-upload-dual">
                        <button
                          type="button"
                          className="kyc-upload-trigger"
                          onClick={() => {
                            if (photoInputRef.current) {
                              photoInputRef.current.removeAttribute('capture');
                            }
                            photoInputRef.current?.click();
                          }}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? (
                            <span>Processing...</span>
                          ) : (
                            <>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              <span>Upload Photo</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="kyc-upload-trigger kyc-camera-btn"
                          onClick={handleCaptureLivePhoto}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                          </svg>
                          <span>Take Photo</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="kyc-step-actions">
                  <button className="kyc-btn kyc-btn-secondary" onClick={handlePrevStep}>Back</button>
                  <button className="kyc-btn kyc-btn-primary" onClick={handleNextStep} disabled={!canProceedToSubmit}>
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === STEPS.ADDITIONAL && (
              <div className="kyc-step-content">
                <h3>Additional Information</h3>
                <p className="kyc-step-desc">Provide any additional information required for verification.</p>

                <div className="kyc-form-group">
                  <label>Additional Notes (optional)</label>
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Any additional information that may help with verification..."
                    rows={4}
                  />
                </div>

                <div className="kyc-step-actions">
                  <button className="kyc-btn kyc-btn-secondary" onClick={handlePrevStep}>Back</button>
                  <button className="kyc-btn kyc-btn-primary" onClick={handleNextStep}>Next</button>
                </div>
              </div>
            )}

            {currentStep === STEPS.REVIEW && (
              <div className="kyc-step-content">
                <h3>Review & Submit</h3>
                <p className="kyc-step-desc">Review your information before submitting.</p>

                <div className="kyc-review-card">
                  <div className="kyc-review-row">
                    <span>Full Name</span>
                    <span>{user?.name}</span>
                  </div>
                  <div className="kyc-review-row">
                    <span>NIN Number</span>
                    <span style={{ fontFamily: 'monospace' }}>{ninNumber}</span>
                  </div>
                  <div className="kyc-review-row">
                    <span>Name on NIN</span>
                    <span>{nameOnNin}</span>
                  </div>
                  <div className="kyc-review-row">
                    <span>NIN Slip</span>
                    <span>{ninSlipImage ? 'Uploaded' : 'Missing'}</span>
                  </div>
                  <div className="kyc-review-row">
                    <span>Live Photo</span>
                    <span>{livePhoto ? 'Uploaded' : 'Missing'}</span>
                  </div>
                  {additionalInfo && (
                    <div className="kyc-review-row">
                      <span>Additional Info</span>
                      <span>{additionalInfo}</span>
                    </div>
                  )}
                </div>

                <div className="kyc-step-actions">
                  <button className="kyc-btn kyc-btn-secondary" onClick={handlePrevStep}>Back</button>
                  <button
                    className="kyc-btn kyc-btn-primary kyc-submit-btn"
                    onClick={handleSubmitKyc}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Verification'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
