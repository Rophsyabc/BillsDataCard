import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import { useApp } from '../context/AppContext';

export default function Layout({ children }) {
  const { refreshBalance } = useApp();

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
