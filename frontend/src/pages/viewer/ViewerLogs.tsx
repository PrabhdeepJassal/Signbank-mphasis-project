import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/Layout/PortalLayout';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import apiClient from '../../api/client';
import type { InteractionLog } from '../../types';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './ViewerLogs.css';

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Was calling fetchLogsByUser(viewer's own userId) — showed only the
//         viewer's own page-visit logs, none of the operator's card actions.
//
// Fix:   Call GET /api/logs (all logs) with no-cache headers so the browser
//        doesn't serve a stale cached response.
//        Poll every 4 seconds so new operator actions appear automatically.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 4000;

export default function ViewerLogs() {
  const navigate = useNavigate();

  const [logs, setLogs]             = useState<InteractionLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError]           = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch all logs ───────────────────────────────────────────────────────
  const fetchAllLogs = useCallback(() => {
    apiClient
      .get<InteractionLog[]>('/api/logs', {
        // Prevent browser from caching the response so every poll hits the server
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      })
      .then(res => {
        // Sort newest first
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
        );
        setLogs(sorted);
        setLastUpdated(new Date());
        setError('');
      })
      .catch(err => {
        setError(
          err?.response?.status === 401
            ? 'Access denied — add GET /api/logs to permitAll in SecurityConfig.java'
            : 'Failed to fetch logs. Is the backend running?'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Start polling ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllLogs();                               // immediate first fetch
    pollRef.current = setInterval(fetchAllLogs, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAllLogs]);

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'GESTURE_ID' && evt.id === 'G003') navigate('/viewer/dashboard');
    if (evt.type === 'BACK_DYNAMIC') navigate('/viewer/dashboard');
  }, [navigate]);

  return (
    <PortalLayout title="Viewer" subtitle="Logs" backPath="/viewer/dashboard" showLogout={false}>
      <div className="viewer-logs-layout">
        <div className="logs-content">

          {/* Header with live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Interaction Logs
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {lastUpdated && (
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              {/* Pulsing green dot = live */}
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: error ? '#ef4444' : '#22c55e',
                boxShadow: error ? '0 0 0 3px #fecaca' : '0 0 0 3px #bbf7d0',
                animation: 'livePulse 2s ease-in-out infinite',
              }} title={error ? 'Error' : 'Live — refreshes every 4 s'} />
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

          <div className="table-card">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>User</th>
                  <th>Command</th>
                  <th>Gesture</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="empty-row">Loading logs…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={7} className="empty-row">No logs found</td></tr>
                ) : logs.map(l => (
                  <tr key={l.interactionId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={l.interactionId}>
                      {l.interactionId}
                    </td>
                    <td>{l.user?.username ?? l.user?.userId ?? '—'}</td>
                    <td>{l.command?.commandName ?? '—'}</td>
                    <td>
                      {l.gesture
                        ? `${l.gesture.gestureSymbol ?? ''} ${l.gesture.gestureName}`
                        : '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${l.status}`}>{l.status}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(l.executedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit',
                        minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td style={{
                      fontSize: '0.8rem', color: '#64748b',
                      maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }} title={l.metadata ?? ''}>
                      {l.metadata ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#94a3b8' }}>
            {logs.length} log{logs.length !== 1 ? 's' : ''} · auto-refreshes every {POLL_MS / 1000}s
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