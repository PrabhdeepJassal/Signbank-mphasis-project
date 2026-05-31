import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useFraud } from '../../context/FraudContext';
import { fetchFraudAnalytics } from '../../api/fraudApi';
import type { FraudAnalytics } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import './FraudDashboardPage.css';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const SEV_COLORS: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#10b981' };

export default function FraudDashboardPage() {
  const navigate = useNavigate();
  const { alerts, unacknowledgedAlerts } = useFraud();
  const [analytics, setAnalytics] = useState<FraudAnalytics | null>(null);

  useEffect(() => {
    fetchFraudAnalytics().then(setAnalytics);
  }, [alerts]);

  const severityData = SEV_ORDER
    .map(s => ({ name: s, value: analytics?.alertsBySeverity?.[s] ?? 0 }))
    .filter(d => d.value > 0);

  const trendData = analytics?.alertTrend ?? [];

  return (
    <AdminLayout>
      <div className="fraud-dashboard">
        <div className="fraud-dashboard-header">
          <div>
            <h1>Fraud Detection</h1>
            <p className="fraud-sub">Real-time security monitoring & alerts</p>
          </div>
          <div className="fraud-header-actions">
            <button className="add-btn" onClick={() => navigate('/admin/fraud/alerts')}>
              View All Alerts
            </button>
            <button className="fraud-nav-btn rules" onClick={() => navigate('/admin/fraud/rules')}>
              Alert Rules
            </button>
          </div>
        </div>

        <div className="fraud-quick-nav">
          <div className="fraud-quick-card" onClick={() => navigate('/admin/fraud/alerts')}>
            <div className="fraud-quick-icon">&#9888;</div>
            <div className="fraud-quick-info">
              <div className="fraud-quick-title">View Alerts</div>
              <div className="fraud-quick-desc">
                {alerts.length > 0
                  ? `${unacknowledgedAlerts.length} unacknowledged of ${alerts.length} total`
                  : 'No alerts yet'}
              </div>
            </div>
          </div>
          <div className="fraud-quick-card" onClick={() => navigate('/admin/fraud/rules')}>
            <div className="fraud-quick-icon" style={{ background: '#d97706' }}>&#9881;</div>
            <div className="fraud-quick-info">
              <div className="fraud-quick-title">Configure Rules</div>
              <div className="fraud-quick-desc">Toggle rules on/off, edit thresholds</div>
            </div>
          </div>
        </div>

        <div className="fraud-stat-cards">
          <div className="fraud-stat-card total">
            <div className="fraud-stat-num">{analytics?.totalAlerts ?? 0}</div>
            <div className="fraud-stat-label">Total Alerts</div>
          </div>
          <div className="fraud-stat-card active">
            <div className="fraud-stat-num">{unacknowledgedAlerts.length}</div>
            <div className="fraud-stat-label">Active (Unacknowledged)</div>
          </div>
          <div className="fraud-stat-card resolved">
            <div className="fraud-stat-num">{analytics?.resolvedAlerts ?? 0}</div>
            <div className="fraud-stat-label">Resolved</div>
          </div>
          <div className="fraud-stat-card rate">
            <div className="fraud-stat-num">
              {analytics && analytics.totalAlerts > 0
                ? Math.round((analytics.resolvedAlerts / analytics.totalAlerts) * 100)
                : 0}%
            </div>
            <div className="fraud-stat-label">Resolution Rate</div>
          </div>
        </div>

        <div className="fraud-charts">
          <div className="fraud-chart-card">
            <h3>Alerts Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="fraud-chart-card">
            <h3>By Severity</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {severityData.map((entry, i) => (
                    <Cell key={entry.name} fill={SEV_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fraud-recent">
          <div className="fraud-recent-header">
            <h3>Recent Alerts</h3>
            <button className="fraud-view-all" onClick={() => navigate('/admin/fraud/alerts')}>
              View All &rarr;
            </button>
          </div>
          <table className="fraud-table">
            <thead>
              <tr><th>Alert ID</th><th>Message</th><th>Severity</th><th>Status</th><th>User</th><th>Time</th></tr>
            </thead>
            <tbody>
              {alerts.slice(0, 10).map(a => (
                <tr key={a.alertId} className="fraud-row-clickable" onClick={() => navigate('/admin/fraud/alerts')}>
                  <td className="fraud-cell-id">{a.alertId.substring(0, 12)}</td>
                  <td>{a.message}</td>
                  <td>
                    <span className={`sev-badge ${a.severity.toLowerCase()}`}>{a.severity}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${a.status === 'NEW' ? 'pending' : a.status === 'ACKNOWLEDGED' ? 'active' : 'inactive'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.userId}</td>
                  <td>{new Date(a.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr><td colSpan={6} className="fraud-empty">No alerts yet. System is clean.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
