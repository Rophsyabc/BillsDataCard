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
  { path: '/rewards', label: 'Rewards', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
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
