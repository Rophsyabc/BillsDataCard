import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useKyc } from '../context/KycContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function getStatusColor(status) {
  switch (status) {
    case 'verified': return '#10B981';
    case 'pending': return '#F59E0B';
    case 'rejected': return '#EF4444';
    case 'resubmission_required': return '#EF4444';
    case 'incomplete': return '#EF4444';
    case 'none': return '#EF4444';
    default: return '#94A3B8';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'verified': return 'Verified';
    case 'pending': return 'Pending Review';
    case 'rejected': return 'Rejected';
    case 'resubmission_required': return 'Action Required';
    case 'incomplete': return 'Incomplete';
    case 'none': return 'Not Verified';
    default: return 'Unknown';
  }
}

function getStatusAriaLabel(status) {
  switch (status) {
    case 'verified': return 'Identity verified';
    case 'pending': return 'Verification pending review';
    case 'rejected': return 'Verification rejected';
    case 'resubmission_required': return 'Verification requires resubmission';
    case 'incomplete': return 'Verification incomplete';
    case 'none': return 'Verification not started';
    default: return 'Verification status unknown';
  }
}

export default function ProfileAvatar({ size = 40, showStatus = true, onClick, className = '' }) {
  const { user, token } = useApp();
  const { openKyc } = useKyc();
  const [kycStatus, setKycStatus] = useState(null);

  useEffect(() => {
    if (token) {
      fetchKycStatus();
    }
  }, [token]);

  const fetchKycStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setKycStatus(data.data);
    } catch (e) {
      // Silent fail - avatar still shows without status
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openKyc();
    }
  };

  const status = kycStatus?.status || 'none';
  const isUnverified = status !== 'verified';
  const statusColor = getStatusColor(status);
  const photo = kycStatus?.photo || user?.photo || '';

  return (
    <button
      className={`profile-avatar-btn ${className}`}
      onClick={handleClick}
      aria-label={`${getStatusAriaLabel(status)}. Click to manage verification.`}
      title={getStatusLabel(status)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        background: 'transparent',
        flexShrink: 0,
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt={`${user?.name || 'User'} profile`}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: isUnverified ? `2px solid ${statusColor}` : '2px solid rgba(255,255,255,0.3)',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: size * 0.38,
            color: '#fff',
            background: isUnverified
              ? `linear-gradient(135deg, ${statusColor}dd, ${statusColor}99)`
              : 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.15))',
            border: isUnverified ? `2px solid ${statusColor}` : '2px solid rgba(255,255,255,0.3)',
            letterSpacing: '-0.5px',
          }}
        >
          {getInitials(user?.name)}
        </div>
      )}

      {showStatus && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(size * 0.3, 12),
            height: Math.max(size * 0.3, 12),
            borderRadius: '50%',
            background: statusColor,
            border: '2px solid var(--primary, #6C63FF)',
            boxShadow: isUnverified ? `0 0 0 1px ${statusColor}40` : 'none',
          }}
        />
      )}
    </button>
  );
}

export function KycStatusBadge({ status, size = 'normal' }) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '3px 10px' : '5px 14px',
        borderRadius: 20,
        fontSize: isSmall ? '0.7rem' : '0.8rem',
        fontWeight: 600,
        background: `${color}18`,
        color: color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
