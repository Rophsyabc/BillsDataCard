import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const token = () => localStorage.getItem('paybills_token');

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', message: '', type: 'info' });

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/admin/settings`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
      fetch(`${API_BASE}/api/admin/announcements`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
    ]).then(([s, a]) => {
      if (s.success) setSettings(s.data);
      if (a.success) setAnnouncements(a.data);
      setLoading(false);
    });
  }, []);

  const saveSettings = async () => {
    await fetch(`${API_BASE}/api/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addAnnouncement = async () => {
    if (!newAnn.title || !newAnn.message) return;
    await fetch(`${API_BASE}/api/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(newAnn),
    });
    setNewAnn({ title: '', message: '', type: 'info' });
    const res = await fetch(`${API_BASE}/api/admin/announcements`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) setAnnouncements(data.data);
  };

  const deleteAnnouncement = async (id) => {
    await fetch(`${API_BASE}/api/admin/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  if (loading) return <AdminLayout><h2>Settings</h2><p>Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <h2>System Settings</h2>
      <p className="subtitle">Configure platform settings</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="form-card">
          <h3 style={{ marginBottom: 16 }}>General</h3>
          <div className="form-group">
            <label>Platform Name</label>
            <input value={settings.platform_name || ''} onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Platform Fee (%)</label>
            <input type="number" value={settings.platform_fee_percent || ''} onChange={(e) => setSettings({ ...settings, platform_fee_percent: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Min Fund Amount (₦)</label>
            <input type="number" value={settings.min_fund_amount || ''} onChange={(e) => setSettings({ ...settings, min_fund_amount: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Max Fund Amount (₦)</label>
            <input type="number" value={settings.max_fund_amount || ''} onChange={(e) => setSettings({ ...settings, max_fund_amount: e.target.value })} />
          </div>
        </div>

        <div className="form-card">
          <h3 style={{ marginBottom: 16 }}>Payment (Paystack)</h3>
          <div className="form-group">
            <label>Public Key</label>
            <input value={settings.paystack_public_key || ''} onChange={(e) => setSettings({ ...settings, paystack_public_key: e.target.value })} placeholder="pk_test_..." />
          </div>
          <div className="form-group">
            <label>Secret Key</label>
            <input type="password" value={settings.paystack_secret_key || ''} onChange={(e) => setSettings({ ...settings, paystack_secret_key: e.target.value })} placeholder="sk_test_..." />
          </div>
          <h3 style={{ marginBottom: 12, marginTop: 20 }}>Toggles</h3>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={settings.maintenance_mode === 'true'} onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? 'true' : 'false' })} />
              Maintenance Mode
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={settings.registration_open === 'true'} onChange={(e) => setSettings({ ...settings, registration_open: e.target.checked ? 'true' : 'false' })} />
              Registration Open
            </label>
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={saveSettings} style={{ marginTop: 16 }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      <div className="form-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Announcements</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, marginBottom: 16 }}>
          <input placeholder="Title" value={newAnn.title} onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <input placeholder="Message" value={newAnn.message} onChange={(e) => setNewAnn({ ...newAnn, message: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          <select value={newAnn.type} onChange={(e) => setNewAnn({ ...newAnn, type: e.target.value })} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
          </select>
        </div>
        <button className="btn-primary" onClick={addAnnouncement}>Add Announcement</button>

        {announcements.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {announcements.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: a.type === 'warning' ? 'rgba(245,158,11,0.1)' : a.type === 'success' ? 'rgba(16,185,129,0.1)' : 'var(--primary-light)' }}>
                <div>
                  <strong>{a.title}</strong>
                  <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.message}</span>
                </div>
                <button className="btn-sm btn-danger" onClick={() => deleteAnnouncement(a.id)}>Del</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
