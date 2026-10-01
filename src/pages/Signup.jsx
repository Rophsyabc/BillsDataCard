import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Signup() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const googleBtnRef = useRef(null);
  const googleReady = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleReady.current) return;

    const loadGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current && !googleReady.current) {
        googleReady.current = true;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth,
          text: 'continue_with',
        });
      }
    };

    if (window.google?.accounts?.id) {
      loadGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = loadGoogle;
    document.body.appendChild(script);
  }, []);

  const handleGoogleCredential = async (response) => {
    setLoading(true);
    setError('');
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: response.credential,
          email: payload.email,
          name: payload.name,
          googleId: payload.sub,
          photo: payload.picture || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.data.user, data.data.token, data.data.refreshToken);
        navigate('/');
      } else {
        setError(data.message || 'Google signup failed');
      }
    } catch {
      setError('Google authentication failed');
    } finally {
      setLoading(false);
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

  const passwordStrength = getPasswordStrength(password);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, referralCode }),
      });
      const data = await res.json();

      if (data.success) {
        setVerificationToken(data.data.verificationToken);
        setShowVerification(true);
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      console.error('[signup] Error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });
      const data = await res.json();

      if (data.success) {
        navigate('/login?verified=1');
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1>PayBills</h1>
            <h2>Verify Your Email</h2>
            <p>We sent a verification code to <strong>{email}</strong></p>
          </div>

          {error && <div className="alert alert-error"><p>{error}</p></div>}

          <div className="auth-form">
            <div className="form-group">
              <label>Verification Token</label>
              <input
                type="text"
                placeholder="Enter verification token"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
              />
              <small className="form-hint">
                For demo, use: <code>{verificationToken}</code>
              </small>
            </div>

            <button className="btn-primary" onClick={handleVerifyEmail} disabled={loading || !verificationToken}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <button className="btn-secondary" onClick={() => navigate('/')}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>PayBills</h1>
          <h2>Create Account</h2>
          <p>Join PayBills to pay bills easily</p>
        </div>

        {error && <div className="alert alert-error"><p>{error}</p></div>}

        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 08031234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={11}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button type="button" className="eye-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {password && (
              <div className="password-strength">
                <div className="strength-bar"><div className="strength-fill" style={{ width: `${(passwordStrength.score + 1) * 25}%`, background: passwordStrength.color }} /></div>
                <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-input-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" className="eye-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Referral Code (Optional)</label>
            <input
              type="text"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or sign up with</span>
        </div>

        <div className="auth-social">
          <div ref={googleBtnRef} style={{ width: '100%', minHeight: 44 }} />
          {!GOOGLE_CLIENT_ID && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
              Google Sign-In not configured
            </p>
          )}
        </div>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
