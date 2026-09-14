import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/wallet', label: 'My Wallet', icon: '💰' },
  { path: '/services', label: 'All Services', icon: '🛍️' },
  { path: '/airtime', label: 'Airtime', icon: '📱' },
  { path: '/data', label: 'Data', icon: '📶' },
  { path: '/electricity', label: 'Electricity', icon: '⚡' },
  { path: '/tv', label: 'TV Subscription', icon: '📺' },
  { path: '/gift-cards', label: 'Gift Cards', icon: '🎁' },
  { path: '/betting', label: 'Betting Fund', icon: '⚽' },
  { path: '/education', label: 'Education', icon: '📚' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
  { path: '/history', label: 'History', icon: '📋' },
  { path: '/receipt', label: 'Receipt', icon: '🧾' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
  const location = useLocation();
  const { balance } = useApp();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="logo">PayBills</h2>
      </div>
      <div className="sidebar-balance">
        <span className="sb-label">Balance</span>
        <span className="sb-amount">₦{balance.toLocaleString()}</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
