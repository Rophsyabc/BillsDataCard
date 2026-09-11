import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Profile() {
  const { user, token, updateUser } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [sessions, setSessions] = useState([]);
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [kycStep, setKycStep] = useState('idle');
  const [ninNumber, setNinNumber] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobResult, setJobResult] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setKycStatus(data.data);
    } catch (e) {
      console.error('Failed to fetch KYC status:', e);
    }
  };

  const handleStartKyc = async () => {
    if (!/^\d{11}$/.test(ninNumber)) {
      setResult({ success: false, message: 'NIN must be 11 digits' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/smile-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setJobId(data.data.jobId);
        setKycStep('camera');
        setCameraReady(false);
        setCameraError('');
      } else {
        setResult(data);
      }
    } catch {
      setResult({ success: false, message: 'Failed to start verification' });
    }
    setLoading(false);
  };

  const handleCameraReady = () => setCameraReady(true);

  const handleCameraError = (e) => {
    setCameraError(e.detail?.message || 'Camera access denied');
    setCameraReady(false);
  };

  const handleImagesCaptured = async (e) => {
    setLoading(true);
    setKycStep('processing');
    try {
      const images = e.detail?.images || [];
      const selfieImg = images.find(i => i.image_type_id === 0 || i.image_type_id === 2);
      const livenessImgs = images.filter(i => i.image_type_id === 4 || i.image_type_id === 6);
      const docImg = images.find(i => i.image_type_id === 1 || i.image_type_id === 3);

      const body = {
        ninNumber,
        selfieImage: selfieImg?.image || '',
        livenessImages: livenessImgs.map(i => i.image),
        documentImage: docImg?.image || '',
      };

      const res = await fetch(`${API_BASE}/api/kyc/smile-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setJobResult(data.data);
        setKycStep(data.data.status === 'verified' ? 'verified' : data.data.status === 'failed' ? 'failed' : 'processing');
        if (data.data.status === 'verified') fetchKycStatus();
      } else {
        setResult(data);
        setKycStep('idle');
      }
    } catch {
      setResult({ success: false, message: 'Failed to submit verification' });
      setKycStep('idle');
    }
    setLoading(false);
  };

  const pollJobStatus = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setJobResult(data.data);
        if (data.data.status === 'verified' || data.data.status === 'failed') {
          setKycStep(data.data.status);
          fetchKycStatus();
        } else {
          setTimeout(pollJobStatus, 3000);
        }
      }
    } catch {}
    setLoading(false);
  };

  const handleSendPhoneOtp = async () => {
    if (!phone) { setResult({ success: false, message: 'Enter your phone number first' }); return; }
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
    if (!/^\d{6}$/.test(phoneOtp)) { setResult({ success: false, message: 'Enter 6-digit OTP' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone, otp: phoneOtp }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) fetchKycStatus();
    } catch {
      setResult({ success: false, message: 'Failed to verify phone' });
    }
    setLoading(false);
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSessions(data.data);
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        updateUser(data.data);
        setResult({ success: true, message: 'Profile updated' });
      } else {
        setResult({ success: false, message: data.message });
      }
    } catch {
      setResult({ success: false, message: 'Failed to update profile' });
    }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResult({ success: false, message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    } catch {
      setResult({ success: false, message: 'Failed to change password' });
    }
    setLoading(false);
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/setup-2fa`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTwoFASetup(data.data);
    } catch (e) {
      console.error('Failed to setup 2FA:', e);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/enable-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) { setTwoFASetup(null); setTwoFACode(''); updateUser({ twoFactorEnabled: true }); }
    } catch {
      setResult({ success: false, message: 'Failed to enable 2FA' });
    }
    setLoading(false);
  };

  const handleDisable2FA = async () => {
    const password = prompt('Enter your password to disable 2FA:');
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/disable-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) updateUser({ twoFactorEnabled: false });
    } catch {
      setResult({ success: false, message: 'Failed to disable 2FA' });
    }
    setLoading(false);
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSessions();
    } catch (e) {
      console.error('Failed to revoke session:', e);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm('Revoke all sessions? You will be logged out everywhere.')) return;
    try {
      await fetch(`${API_BASE}/auth/sessions`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSessions();
    } catch (e) {
      console.error('Failed to revoke sessions:', e);
    }
  };

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#6C63FF'];
    return { score, label: labels[score] || 'Weak', color: colors[score] || '#EF4444' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="page">
      <h2>My Profile</h2>
      <p className="subtitle">Manage your account settings</p>

      {result && (
        <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
          <p>{result.message}</p>
          <button className="btn-close" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="wallet-tabs">
        <button className={`wallet-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile</button>
        <button className={`wallet-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</button>
        <button className={`wallet-tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>Sessions</button>
        <button className={`wallet-tab ${activeTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveTab('kyc')}>KYC</button>
        <button className={`wallet-tab ${activeTab === 'referral' ? 'active' : ''}`} onClick={() => setActiveTab('referral')}>Referral</button>
        {user?.role === 'admin' && (
          <button className="wallet-tab" onClick={() => window.location.href = '/admin'}>⚙️ Admin</button>
        )}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="form-card">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled />
            <small className="form-hint">{user?.emailVerified ? '✓ Verified' : '⚠ Not verified'}</small>
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={11} />
          </div>
          <div className="form-group">
            <label>Referral Code</label>
            <input type="text" value={user?.referralCode || ''} readOnly />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="form-card">
          <h3 style={{ marginBottom: '16px' }}>Change Password</h3>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input-wrap">
                <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                <button type="button" className="eye-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrap">
                <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                <button type="button" className="eye-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {newPassword && (
                <div className="password-strength">
                  <div className="strength-bar"><div className="strength-fill" style={{ width: `${(passwordStrength.score + 1) * 25}%`, background: passwordStrength.color }} /></div>
                  <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</button>
          </form>

          <hr style={{ margin: '24px 0', border: '1px solid var(--border)' }} />

          <h3 style={{ marginBottom: '16px' }}>Two-Factor Authentication (2FA)</h3>
          {user?.twoFactorEnabled ? (
            <div>
              <p style={{ color: 'var(--success)', marginBottom: '12px' }}>✓ 2FA is enabled</p>
              <button className="btn-secondary" onClick={handleDisable2FA} disabled={loading}>Disable 2FA</button>
            </div>
          ) : twoFASetup ? (
            <div>
              <p style={{ marginBottom: '12px' }}>Scan this QR code with your authenticator app:</p>
              <img src={twoFASetup.qrCode} alt="2FA QR Code" style={{ width: 200, height: 200, marginBottom: 12 }} />
              <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>Or enter this code manually: <code>{twoFASetup.secret}</code></p>
              <div className="form-group">
                <label>Enter verification code</label>
                <input type="text" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} placeholder="6-digit code" maxLength={6} />
              </div>
              <button className="btn-primary" onClick={handleEnable2FA} disabled={loading || twoFACode.length !== 6}>Enable 2FA</button>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleSetup2FA}>Enable 2FA</button>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Active Sessions</h3>
            <button className="btn-secondary" onClick={handleRevokeAll} style={{ fontSize: '0.8rem' }}>Revoke All</button>
          </div>
          {sessions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No active sessions</p> : sessions.map((s) => (
            <div key={s.id} className="session-item">
              <div><strong>{s.device || 'Unknown Device'}</strong></div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>IP: {s.ip || 'Unknown'} | Last active: {new Date(s.lastActive).toLocaleDateString()}</div>
              <button className="btn-secondary" onClick={() => handleRevokeSession(s.id)} style={{ marginTop: 8, fontSize: '0.8rem' }}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'kyc' && (
        <div className="form-card">
          <h3 style={{ marginBottom: '8px' }}>Identity Verification</h3>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Verify your NIN with live photo capture to unlock all features.
          </p>

          {kycStatus && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Verification Status</span>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                  background: kycStatus.status === 'verified' ? 'rgba(16,185,129,0.1)' : kycStatus.status === 'pending' || kycStatus.status === 'processing' ? 'rgba(245,158,11,0.1)' : kycStatus.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
                  color: kycStatus.status === 'verified' ? 'var(--success)' : kycStatus.status === 'pending' || kycStatus.status === 'processing' ? 'var(--warning)' : kycStatus.status === 'failed' ? 'var(--error)' : 'var(--text-secondary)',
                }}>
                  {kycStatus.status === 'verified' ? 'Verified' : kycStatus.status === 'pending' || kycStatus.status === 'processing' ? 'Processing...' : kycStatus.status === 'failed' ? 'Failed' : 'Not Started'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>Email: {kycStatus.emailVerified ? 'Verified' : 'Not Verified'}</span>
                <span>Phone: {kycStatus.phoneVerified ? 'Verified' : 'Not Verified'}</span>
              </div>
            </div>
          )}

          {/* Phone Verification */}
          {kycStatus && !kycStatus.phoneVerified && (
            <div style={{ marginBottom: '16px', padding: '14px', background: 'var(--bg)', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '0.9rem' }}>Step 1: Verify Phone</h4>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" maxLength={11} style={{ width: '100%' }} />
              </div>
              {!phoneSent ? (
                <button className="btn-primary" onClick={handleSendPhoneOtp} disabled={loading || !phone} style={{ width: '100%' }}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} style={{ width: '100%' }} />
                  </div>
                  <button className="btn-primary" onClick={handleVerifyPhone} disabled={loading || phoneOtp.length !== 6} style={{ width: '100%' }}>
                    {loading ? 'Verifying...' : 'Verify Phone'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: NIN + Camera */}
          {kycStatus && kycStatus.status !== 'verified' && kycStatus.status !== 'pending' && kycStep === 'idle' && (
            <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '0.9rem' }}>Step 2: NIN Verification</h4>
              <p style={{ marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Enter your 11-digit NIN, then capture your NIN slip + live selfie with smile and eye blink.
              </p>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem' }}>NIN Number</label>
                <input type="text" value={ninNumber} onChange={(e) => setNinNumber(e.target.value.replace(/\D/g, ''))} placeholder="11-digit NIN" maxLength={11} style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '2px' }} />
              </div>
              <button className="btn-primary" onClick={handleStartKyc} disabled={loading || ninNumber.length !== 11} style={{ width: '100%' }}>
                {loading ? 'Starting...' : 'Start Camera Verification'}
              </button>
            </div>
          )}

          {/* Step 3: Camera */}
          {kycStep === 'camera' && (
            <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '0.9rem' }}>Live Capture</h4>
              <p style={{ marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Capture your NIN slip, then take a selfie with liveness (smile + blink).
              </p>
              {cameraError && (
                <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: 'var(--error)', marginBottom: '12px', fontSize: '0.85rem' }}>
                  {cameraError}
                </div>
              )}
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                <smart-camera-web
                  capture-id="back"
                  onReady={handleCameraReady}
                  onError={handleCameraError}
                  onImagesComputed={handleImagesCaptured}
                />
              </div>
              <button className="btn-secondary" onClick={() => setKycStep('idle')} style={{ width: '100%', marginTop: '10px' }}>
                Cancel
              </button>
            </div>
          )}

          {/* Processing */}
          {kycStep === 'processing' && (
            <div style={{ padding: '20px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>&#9203;</div>
              <p style={{ color: 'var(--warning)', fontWeight: 600 }}>Verifying your identity...</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                This may take a few moments. Please don't close this page.
              </p>
              <button className="btn-secondary" onClick={pollJobStatus} disabled={loading} style={{ marginTop: '12px' }}>
                {loading ? 'Checking...' : 'Check Status'}
              </button>
            </div>
          )}

          {/* Verified */}
          {kycStep === 'verified' && (
            <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>&#10003;</div>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>Identity Verified!</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Your NIN has been verified. You now have full access.
              </p>
            </div>
          )}

          {/* Failed */}
          {kycStep === 'failed' && (
            <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>&#10007;</div>
              <p style={{ color: 'var(--error)', fontWeight: 600 }}>Verification Failed</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '12px' }}>
                {jobResult?.result?.ResultText || 'Unable to verify your identity. Please try again.'}
              </p>
              <button className="btn-primary" onClick={() => { setKycStep('idle'); setJobResult(null); setNinNumber(''); }} style={{ width: '100%' }}>
                Try Again
              </button>
            </div>
          )}

          {/* Already verified */}
          {kycStatus?.status === 'verified' && kycStep === 'idle' && (
            <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>&#10003;</div>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>Identity Verified</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Your identity has been verified. You have full access to all features.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'referral' && (
        <ReferralTab token={token} />
      )}
    </div>
  );
}

function ReferralTab({ token }) {
  const [referralData, setReferralData] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/user/referrals`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => { if (d.success) setReferralData(d.data); }).catch(() => {});
  }, [token]);

  if (!referralData) return <p>Loading...</p>;

  return (
    <div className="form-card">
      <h3 style={{ marginBottom: '16px' }}>Referral Program</h3>
      <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Share your referral code and earn rewards when friends sign up!</p>
      <div className="form-group">
        <label>Your Referral Code</label>
        <input type="text" value={referralData.code} readOnly style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '2px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg)', borderRadius: 10 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{referralData.count}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Referrals</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg)', borderRadius: 10 }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>₦{referralData.reward.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Earned</div>
        </div>
      </div>
      {referralData.referrals.length > 0 && (
        <div>
          <h4 style={{ marginBottom: 8 }}>Your Referrals</h4>
          {referralData.referrals.map((r) => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
              {r.name} ({r.email}) - Joined {new Date(r.createdAt).toLocaleDateString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
