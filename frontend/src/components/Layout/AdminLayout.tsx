import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ReactNode } from 'react';
import './AdminLayout.css';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="admin-brand">
          <div className="brand-logo">SB</div>
          <div>
            <div className="brand-title">SignBank Enterprise</div>
            <div className="brand-sub">Gesture Driven Smart Interaction Platform</div>
          </div>
        </div>
        <button className="logout-btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
