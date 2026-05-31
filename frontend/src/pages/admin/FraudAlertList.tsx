import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import Modal from '../../components/ui/Modal';
import { useFraud } from '../../context/FraudContext';
import { fetchAlerts, clearAllAlerts } from '../../api/fraudApi';
import type { FraudAlert } from '../../types';
import './FraudAlertList.css';

export default function FraudAlertList() {
  const navigate = useNavigate();
  const { acknowledge, resolve, refresh } = useFraud();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  useEffect(() => {
    const params: { severity?: string; status?: string } = {};
    if (filterSeverity) params.severity = filterSeverity;
    if (filterStatus) params.status = filterStatus;
    fetchAlerts(params).then(setAlerts);
  }, [filterSeverity, filterStatus]);

  const handleAcknowledge = async (id: string) => {
    await acknowledge(id);
    setAlerts(prev => prev.map(a => a.alertId === id ? { ...a, status: 'ACKNOWLEDGED' as const } : a));
  };

  const handleResolve = async (id: string) => {
    await resolve(id);
    setAlerts(prev => prev.map(a => a.alertId === id ? { ...a, status: 'RESOLVED' as const } : a));
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const result = await clearAllAlerts();
      setClearResult(result.message);
      setAlerts([]);
      setTimeout(() => setClearResult(null), 4000);
    } catch {
      setClearResult('Failed to clear alerts');
      setTimeout(() => setClearResult(null), 4000);
    } finally {
      setClearing(false);
      setShowClearModal(false);
    }
  };

  return (
    <AdminLayout>
      <div className="fraud-alert-list">
        <div className="fraud-alert-header">
          <div>
            <h1>Fraud Alerts</h1>
            <p className="fraud-sub">View, filter, and manage all security alerts</p>
          </div>
          <div className="header-actions">
            {alerts.length > 0 && (
              <button className="fraud-clear-btn" onClick={() => setShowClearModal(true)}>
                Clear All
              </button>
            )}
            <button className="back-btn" onClick={() => navigate('/admin/fraud')}>&larr; Back</button>
          </div>
        </div>

        {clearResult && (
          <div className="success-banner">{clearResult}</div>
        )}

        <div className="fraud-filters">
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <span className="fraud-count-label">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="fraud-table-card">
          <table className="fraud-table">
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Rule</th>
                <th>Message</th>
                <th>Severity</th>
                <th>Status</th>
                <th>User</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.alertId}>
                  <td className="fraud-cell-id">{a.alertId.substring(0, 12)}</td>
                  <td>{a.ruleId}</td>
                  <td className="fraud-msg-cell">{a.message}</td>
                  <td>
                    <span className={`sev-badge ${a.severity.toLowerCase()}`}>{a.severity}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${a.status === 'NEW' ? 'pending' : a.status === 'ACKNOWLEDGED' ? 'active' : 'inactive'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.userId}</td>
                  <td className="fraud-time-cell">{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="fraud-actions">
                      {a.status === 'NEW' && (
                        <button className="fraud-action-btn acknowledge" onClick={() => handleAcknowledge(a.alertId)}>
                          Acknowledge
                        </button>
                      )}
                      {(a.status === 'NEW' || a.status === 'ACKNOWLEDGED') && (
                        <button className="fraud-action-btn resolve" onClick={() => handleResolve(a.alertId)}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr><td colSpan={8} className="fraud-empty">No alerts match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showClearModal && (
        <Modal title="Clear All Alerts" onClose={() => setShowClearModal(false)}>
          <div className="fraud-clear-modal">
            <p>This will permanently delete <strong>all {alerts.length} fraud alerts</strong> from the database. This action cannot be undone.</p>
            <div className="fraud-clear-warning">
              Alerts are deleted, not archived. Make sure you have reviewed them before clearing.
            </div>
            <div className="modal-actions">
              <button className="back-btn" onClick={() => setShowClearModal(false)}>Cancel</button>
              <button
                className="fraud-clear-confirm"
                onClick={handleClearAll}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
