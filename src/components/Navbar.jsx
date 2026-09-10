import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { balance, user, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h3>Welcome, {user?.name || 'User'}!</h3>
        <span className="navbar-id">{user?.id || ''}</span>
      </div>
      <div className="navbar-right">
        <div className="balance-badge">
          <span className="balance-label">Wallet Balance</span>
          <span className="balance-amount">₦{balance.toLocaleString()}</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
