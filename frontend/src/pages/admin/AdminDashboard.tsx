import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';

const cards = [
  { label: 'Manage Users',    abbr: 'USR', color: '#059669', path: '/admin/users' },
  { label: 'Manage Commands', abbr: 'CMD', color: '#2563eb', path: '/admin/commands' },
  { label: 'Manage Gestures', abbr: 'GST', color: '#d97706', path: '/admin/gestures' },
  { label: 'Manage Pages',    abbr: 'PGS', color: '#7c3aed', path: '/admin/pages' },
  { label: 'View Analytics',  abbr: 'ANL', color: '#db2777', path: '/admin/analytics' },
  { label: 'Manage Mappings', abbr: 'MAP', color: '#0284c7', path: '/admin/mappings' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="dashboard-heading">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage the SignBank Enterprise platform</p>
          </div>
          <button className="logout-btn-admin" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
        <div className="dashboard-grid">
          {cards.map(c => (
            <div
              key={c.label}
              className="dash-card"
              style={{ borderLeft: `4px solid ${c.color}`, '--card-accent-bg': c.color + '15' } as React.CSSProperties}
              onClick={() => navigate(c.path)}
            >
              <div className="dash-abbr" style={{ background: c.color }}>{c.abbr}</div>
              <span className="dash-label">{c.label}</span>
              <span className="dash-arrow" style={{ color: c.color }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
