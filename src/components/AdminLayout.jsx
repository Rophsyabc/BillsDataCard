import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/transactions', label: 'Transactions', icon: '💰' },
  { path: '/admin/plans', label: 'Data Plans', icon: '📶' },
  { path: '/admin/giftcards', label: 'Gift Cards', icon: '🎁' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && <h2 className="logo">Admin Panel</h2>}
          <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '☰' : '✕'}
          </button>
        </div>
        {!collapsed && (
          <div className="sidebar-balance" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Logged in as</span>
            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{user?.name || 'Admin'}</span>
          </div>
        )}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
          <button className="nav-link" onClick={handleLogout} style={{ cursor: 'pointer', border: 'none', background: 'none', width: '100%', textAlign: 'left' }}>
            <span className="nav-icon">🚪</span>
            {!collapsed && <span className="nav-label">Logout</span>}
          </button>
        </nav>
      </aside>
      <div className="main-content" style={{ marginLeft: collapsed ? 72 : 250 }}>
        <main className="page-content" style={{ padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
