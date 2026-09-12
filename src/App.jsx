import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { KycProvider } from './context/KycContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Airtime from './pages/Airtime';
import Data from './pages/Data';
import Electricity from './pages/Electricity';
import TvSubscription from './pages/TvSubscription';
import GiftCards from './pages/GiftCards';
import Betting from './pages/Betting';
import History from './pages/History';
import Receipt from './pages/Receipt';
import TransactionDetails from './pages/TransactionDetails';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminTransactions from './pages/AdminTransactions';
import AdminPlans from './pages/AdminPlans';
import AdminGiftCards from './pages/AdminGiftCards';
import AdminSettings from './pages/AdminSettings';
import './App.css';

function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <KycProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute adminOnly>
                      <Routes>
                        <Route path="/" element={<AdminDashboard />} />
                        <Route path="/users" element={<AdminUsers />} />
                        <Route path="/transactions" element={<AdminTransactions />} />
                        <Route path="/plans" element={<AdminPlans />} />
                        <Route path="/giftcards" element={<AdminGiftCards />} />
                        <Route path="/settings" element={<AdminSettings />} />
                      </Routes>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/wallet" element={<Wallet />} />
                          <Route path="/airtime" element={<Airtime />} />
                          <Route path="/data" element={<Data />} />
                          <Route path="/electricity" element={<Electricity />} />
                          <Route path="/tv" element={<TvSubscription />} />
                          <Route path="/gift-cards" element={<GiftCards />} />
                          <Route path="/betting" element={<Betting />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/receipt" element={<Receipt />} />
                          <Route path="/transaction/:id" element={<TransactionDetails />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/analytics" element={<Analytics />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </KycProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

export default App;
