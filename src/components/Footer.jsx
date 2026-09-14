import { Link, useLocation } from 'react-router-dom';

const footerItems = [
  { path: '/', label: 'Home', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { path: '/wallet', label: 'Card', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )},
  { path: '/services', label: 'Services', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { path: '/analytics', label: 'Rewards', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M6 9l6 6 6-6"/>
      <path d="M12 3l7 4v10l-7 4-7-4V7z"/>
    </svg>
  )},
];

export default function Footer() {
  const location = useLocation();

  return (
    <footer className="footer">
      <nav className="footer-nav">
        {footerItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`footer-item ${isActive ? 'active' : ''}`}
            >
              <span className="footer-icon">{item.icon}</span>
              <span className="footer-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
