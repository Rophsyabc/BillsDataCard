import { useNavigate } from 'react-router-dom';

export default function Education() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="data-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2>Education</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="services-empty" style={{ marginTop: 60 }}>
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>Coming Soon</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Education payment services will be available here.
        </p>
        <button
          className="btn-primary"
          style={{ marginTop: 24, maxWidth: 200 }}
          onClick={() => navigate('/services')}
        >
          Back to Services
        </button>
      </div>
    </div>
  );
}
