import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import KycVerification from './KycVerification';
import { useApp } from '../context/AppContext';
import { useKyc } from '../context/KycContext';

export default function Layout({ children }) {
  const { refreshBalance } = useApp();
  const { kycOpen, closeKyc } = useKyc();

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
      <KycVerification isOpen={kycOpen} onClose={closeKyc} />
    </div>
  );
}
