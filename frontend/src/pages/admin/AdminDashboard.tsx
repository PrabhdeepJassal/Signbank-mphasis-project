import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';

const cards = [
  { label: 'Manage Users',    abbr: 'USR', color: '#dcfce7', accent: '#059669', path: '/admin/users' },
  { label: 'Manage Commands', abbr: 'CMD', color: '#dbeafe', accent: '#2563eb', path: '/admin/commands' },
  { label: 'Manage Gestures', abbr: 'GST', color: '#fef9c3', accent: '#d97706', path: '/admin/gestures' },
  { label: 'Manage Pages',    abbr: 'PGS', color: '#e0e7ff', accent: '#7c3aed', path: '/admin/pages' },
  { label: 'View Analytics',  abbr: 'ANL', color: '#fce7f3', accent: '#db2777', path: '/admin/analytics' },
  { label: 'Manage Mappings', abbr: 'MAP', color: '#e0f2fe', accent: '#0284c7', path: '/admin/mappings' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="dashboard-heading">
          <h1>Admin Dashboard</h1>
          <p>Manage the SignBank Enterprise platform</p>
          <button className="logout-btn-admin" onClick={() => { logout(); navigate('/'); }}>Logout</button>
        </div>
        <div className="dashboard-grid">
          {cards.map(c => (
            <div key={c.label} className="dash-card" style={{ background: c.color, borderLeft: `4px solid ${c.accent}` }} onClick={() => navigate(c.path)}>
              <div className="dash-abbr" style={{ background: c.accent }}>{c.abbr}</div>
              <span className="dash-label">{c.label}</span>
              <span className="dash-arrow" style={{ color: c.accent }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
