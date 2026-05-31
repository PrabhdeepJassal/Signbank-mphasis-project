import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FraudAlertBanner from '../FraudAlertBanner';
import type { ReactNode } from 'react';
import './AdminLayout.css';

const navItems = [
  { label: 'Dashboard',   path: '/admin/dashboard', icon: '◈' },
  { label: 'Users',       path: '/admin/users',     icon: '◆' },
  { label: 'Commands',    path: '/admin/commands',  icon: '⚡' },
  { label: 'Gestures',    path: '/admin/gestures',  icon: '✋' },
  { label: 'Pages',       path: '/admin/pages',     icon: '▣' },
  { label: 'Mappings',    path: '/admin/mappings',  icon: '⇄' },
  { label: 'Analytics',   path: '/admin/analytics', icon: '◉' },
  { label: 'Fraud',       path: '/admin/fraud',     icon: '⚠' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="admin-layout" role="application" aria-label="Admin panel">
      <nav className="admin-sidebar" role="navigation" aria-label="Admin navigation">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true">SB</div>
          <div>
            <div className="sidebar-title">SignBank</div>
            <div className="sidebar-role">Admin Panel</div>
          </div>
        </div>

        <div className="sidebar-nav" role="menubar" aria-orientation="vertical">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="sni-icon" aria-hidden="true">{item.icon}</span>
                <span className="sni-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            onClick={() => { logout(); navigate('/'); }}
            aria-label="Logout from admin panel"
          >
            <span aria-hidden="true">↩</span>
            Logout
          </button>
        </div>
      </nav>

      <FraudAlertBanner />
      <main id="main-content" className="admin-main" role="main" aria-label="Admin content">
        {children}
      </main>
    </div>
  );
}
