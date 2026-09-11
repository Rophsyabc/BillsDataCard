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
  const [kycType, setKycType] = useState('');
  const [kycBvn, setKycBvn] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState('');

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

  const handleSubmitKyc = async () => {
    if (!kycType) { setResult({ success: false, message: 'Please select an ID type' }); return; }
    if (kycType === 'bvn' && !/^\d{11}$/.test(kycBvn)) { setResult({ success: false, message: 'BVN must be 11 digits' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: kycType, bvn: kycBvn }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) fetchKycStatus();
    } catch {
      setResult({ success: false, message: 'Failed to submit KYC' });
    }
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
          <h3 style={{ marginBottom: '16px' }}>Identity Verification (KYC)</h3>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Verify your identity to unlock all features and enable withdrawals.
          </p>

          {kycStatus && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>KYC Status</span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: kycStatus.status === 'verified' ? 'rgba(16,185,129,0.1)' : kycStatus.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  color: kycStatus.status === 'verified' ? 'var(--success)' : kycStatus.status === 'pending' ? 'var(--warning)' : 'var(--error)',
                }}>
                  {kycStatus.status === 'verified' ? '✓ Verified' : kycStatus.status === 'pending' ? '⏳ Pending' : '✗ Not Verified'}
                </span>
              </div>
              {kycStatus.type && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type: {kycStatus.type.replace('_', ' ').toUpperCase()}</div>}
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Email: {kycStatus.emailVerified ? '✓ Verified' : '✗ Not Verified'} | Phone: {kycStatus.phoneVerified ? '✓ Verified' : '✗ Not Verified'}
              </div>
            </div>
          )}

          {/* Phone Verification */}
          {kycStatus && !kycStatus.phoneVerified && (
            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg)', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '12px' }}>Phone Verification</h4>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" maxLength={11} />
              </div>
              {!phoneSent ? (
                <button className="btn-primary" onClick={handleSendPhoneOtp} disabled={loading || !phone}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <div>
                  <div className="form-group">
                    <label>Enter OTP</label>
                    <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder="6-digit code" maxLength={6} />
                  </div>
                  <button className="btn-primary" onClick={handleVerifyPhone} disabled={loading || phoneOtp.length !== 6}>
                    {loading ? 'Verifying...' : 'Verify Phone'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* KYC Submission */}
          {kycStatus && kycStatus.status !== 'verified' && kycStatus.status !== 'pending' && (
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '10px' }}>
              <h4 style={{ marginBottom: '12px' }}>Submit ID Document</h4>
              <div className="form-group">
                <label>ID Type</label>
                <select value={kycType} onChange={(e) => setKycType(e.target.value)}>
                  <option value="">Select ID Type</option>
                  <option value="bvn">BVN (Bank Verification Number)</option>
                  <option value="nin">NIN (National Identification Number)</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="passport">International Passport</option>
                  <option value="voter_card">Voter's Card</option>
                </select>
              </div>
              {kycType === 'bvn' && (
                <div className="form-group">
                  <label>BVN</label>
                  <input type="text" value={kycBvn} onChange={(e) => setKycBvn(e.target.value)} placeholder="11-digit BVN" maxLength={11} />
                </div>
              )}
              <button className="btn-primary" onClick={handleSubmitKyc} disabled={loading || !kycType}>
                {loading ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          )}

          {kycStatus?.status === 'pending' && (
            <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', color: 'var(--warning)' }}>
              Your KYC is under review. This usually takes 24-48 hours. We'll notify you once verified.
            </div>
          )}

          {kycStatus?.status === 'verified' && (
            <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: 'var(--success)' }}>
              Your identity has been verified. You now have full access to all features.
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
