import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import { fetchLogs } from '../../api/logsApi';
import { useData } from '../../context/DataContext';
import type { InteractionLog } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import './AdminAnalytics.css';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminAnalytics() {
  const { gestures, commands } = useData();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<InteractionLog[]>([]);

  useEffect(() => { fetchLogs().then(setLogs); }, []);

  const totalInteractions = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const failCount = logs.filter(l => l.status === 'failed').length;

  const gestureUsage = gestures.map(g => ({
    name: g.gestureName,
    count: logs.filter(l => l.gesture?.gestureId === g.gestureId).length,
  })).filter(g => g.count > 0);

  const commandUsage = commands.map(c => ({
    name: c.commandName,
    count: logs.filter(l => l.command?.commandId === c.commandId).length,
  })).filter(c => c.count > 0);

  const statusData = [
    { name: 'Success', value: successCount },
    { name: 'Failed', value: failCount },
  ];

  return (
    <AdminLayout>
      <div className="analytics-page">
        <div className="analytics-header">
          <div>
            <h1>Analytics</h1>
            <p className="analytics-sub">Platform interaction overview</p>
          </div>
          <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>← Back</button>
        </div>

        <div className="stat-cards">
          <div className="stat-card blue"><div className="stat-num">{totalInteractions}</div><div className="stat-label">Total Interactions</div></div>
          <div className="stat-card green"><div className="stat-num">{successCount}</div><div className="stat-label">Successful</div></div>
          <div className="stat-card red"><div className="stat-num">{failCount}</div><div className="stat-label">Failed</div></div>
          <div className="stat-card purple">
            <div className="stat-num">{totalInteractions > 0 ? Math.round((successCount / totalInteractions) * 100) : 0}%</div>
            <div className="stat-label">Success Rate</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Gesture Usage</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gestureUsage}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3>Status Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card full-width">
            <h3>Command Usage</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commandUsage}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="recent-logs">
          <h3>Recent Interaction Logs</h3>
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>User</th><th>Command</th><th>Gesture</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {[...logs].reverse().slice(0, 10).map(l => (
                <tr key={l.interactionId}>
                  <td>{l.interactionId}</td>
                  <td>{l.userId}</td>
                  <td>{commands.find(c => c.commandId === l.command?.commandId)?.commandName || l.command?.commandName || '—'}</td>
                  <td>{gestures.find(g => g.gestureId === l.gesture?.gestureId)?.gestureSymbol}</td>
                  <td><span className={`status-badge ${l.status}`}>{l.status}</span></td>
                  <td>{new Date(l.executedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
