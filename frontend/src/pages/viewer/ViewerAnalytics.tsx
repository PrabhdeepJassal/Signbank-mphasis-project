import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/Layout/PortalLayout';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import apiClient from '../../api/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import type { InteractionLog } from '../../types';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './ViewerAnalytics.css';

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Was calling fetchLogsByUser(viewer's own userId) — showed only the
//         viewer's own logs (page-visit entries), so charts were always empty.
//
// Fix:   Call GET /api/logs (all logs) with no-cache headers.
//        Poll every 4 seconds so operator actions appear in real time.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 4000;
const COLORS  = ['#22c55e', '#ef4444', '#7c3aed', '#2563eb', '#f59e0b', '#06b6d4'];

export default function ViewerAnalytics() {
  const navigate = useNavigate();

  const [logs, setLogs]               = useState<InteractionLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]             = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch all logs ───────────────────────────────────────────────────────
  const fetchAllLogs = useCallback(() => {
    apiClient
      .get<InteractionLog[]>('/api/logs', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      })
      .then(res => {
        setLogs(res.data);
        setLastUpdated(new Date());
        setError('');
      })
      .catch(err => {
        setError(
          err?.response?.status === 401
            ? 'Access denied — add GET /api/logs to permitAll in SecurityConfig.java'
            : 'Failed to fetch logs'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAllLogs();
    pollRef.current = setInterval(fetchAllLogs, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAllLogs]);

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'GESTURE_ID' && evt.id === 'G003') navigate('/viewer/dashboard');
    if (evt.type === 'BACK_DYNAMIC') navigate('/viewer/dashboard');
  }, [navigate]);

  // ── Derived analytics from ALL logs ─────────────────────────────────────
  const total   = logs.length;
  const success = logs.filter(l => l.status === 'success').length;
  const failed  = logs.filter(l => l.status !== 'success').length;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';

  // Count unique users
  const uniqueUsers = new Set(logs.map(l => l.user?.userId ?? l.user?.username ?? '').filter(Boolean)).size;

  // Gesture usage
  const gestureMap = new Map<string, { name: string; count: number }>();
  logs.forEach(l => {
    if (!l.gesture) return;
    const key = l.gesture.gestureId;
    const ex  = gestureMap.get(key);
    if (ex) ex.count++;
    else    gestureMap.set(key, { name: l.gesture.gestureName, count: 1 });
  });
  const gestureData = Array.from(gestureMap.values()).sort((a, b) => b.count - a.count);

  // Command usage
  const cmdMap = new Map<string, { name: string; count: number }>();
  logs.forEach(l => {
    if (!l.command) return;
    const key = l.command.commandId;
    const ex  = cmdMap.get(key);
    if (ex) ex.count++;
    else    cmdMap.set(key, { name: l.command.commandName, count: 1 });
  });
  const cmdData = Array.from(cmdMap.values()).sort((a, b) => b.count - a.count);

  // Status split for pie
  const statusData = [
    { name: 'Success', value: success },
    { name: 'Failed',  value: failed  },
  ].filter(d => d.value > 0);

  // Activity over last 10 minutes (one bucket per minute)
  const nowMs = Date.now();
  const buckets: Record<string, number> = {};
  for (let i = 9; i >= 0; i--) buckets[`-${i}m`] = 0;
  logs.forEach(l => {
    const diffMin = Math.floor((nowMs - new Date(l.executedAt).getTime()) / 60000);
    if (diffMin >= 0 && diffMin <= 9) buckets[`-${diffMin}m`] = (buckets[`-${diffMin}m`] ?? 0) + 1;
  });
  const activityData = Object.entries(buckets).map(([time, count]) => ({ time, count })).reverse();

  return (
    <PortalLayout title="Viewer" subtitle="Analytics" backPath="/viewer/dashboard" showLogout={false}>
      <div className="viewer-analytics-layout">
        <div className="analytics-content">

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              System Analytics
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {lastUpdated && (
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: error ? '#ef4444' : '#22c55e',
                boxShadow: error ? '0 0 0 3px #fecaca' : '0 0 0 3px #bbf7d0',
                animation: 'livePulse 2s ease-in-out infinite',
              }} title={error ? 'Error' : 'Live'} />
              <span style={{ fontSize: '0.75rem', color: error ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                {error ? 'Error' : 'LIVE'}
              </span>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', marginBottom: 16, borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Stat cards */}
          <div className="stat-row">
            <div className="mini-stat purple">
              <div className="ms-num">{total}</div>
              <div className="ms-label">Total Actions</div>
            </div>
            <div className="mini-stat green">
              <div className="ms-num">{success}</div>
              <div className="ms-label">Success</div>
            </div>
            <div className="mini-stat red">
              <div className="ms-num">{failed}</div>
              <div className="ms-label">Failed</div>
            </div>
            <div className="mini-stat" style={{ background: '#eff6ff' }}>
              <div className="ms-num" style={{ color: '#2563eb' }}>{uniqueUsers}</div>
              <div className="ms-label">Active Users</div>
            </div>
            <div className="mini-stat" style={{ background: '#fffbeb' }}>
              <div className="ms-num" style={{ color: '#d97706' }}>{successRate}%</div>
              <div className="ms-label">Success Rate</div>
            </div>
          </div>

          {/* Charts row 1 */}
          <div className="viewer-charts">
            {/* Command usage */}
            <div className="chart-card" style={{ flex: 2 }}>
              <h3>Command Usage</h3>
              {cmdData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cmdData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="no-data">{loading ? 'Loading…' : 'No data yet'}</p>}
            </div>

            {/* Status pie */}
            <div className="chart-card">
              <h3>Status Split</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Legend /><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="no-data">{loading ? 'Loading…' : 'No data yet'}</p>}
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="viewer-charts" style={{ marginTop: 16 }}>
            {/* Gesture usage */}
            <div className="chart-card">
              <h3>Gesture Usage</h3>
              {gestureData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={gestureData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="no-data">{loading ? 'Loading…' : 'No data yet'}</p>}
            </div>

            {/* Activity last 10 min */}
            <div className="chart-card">
              <h3>Activity (last 10 min)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#94a3b8' }}>
            {total} total log{total !== 1 ? 's' : ''} · auto-refreshes every {POLL_MS / 1000}s
          </div>
        </div>

        <GestureCamera onGesture={handleGesture} />
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </PortalLayout>
  );
}