import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFraud } from '../context/FraudContext';
import './FraudAlertBanner.css';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem('fraud_dismissed');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem('fraud_dismissed', JSON.stringify([...ids]));
}

export default function FraudAlertBanner() {
  const navigate = useNavigate();
  const { unacknowledgedAlerts, acknowledge } = useFraud();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(loadDismissed);

  const visibleAlerts = unacknowledgedAlerts.filter(a => !dismissedIds.has(a.alertId));
  if (visibleAlerts.length === 0) return null;

  const topAlert = visibleAlerts[0];
  const sevClass = topAlert.severity === 'CRITICAL' ? 'critical' : 'high';

  const handleClick = () => {
    navigate('/admin/fraud/alerts');
  };

  const handleAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledge(topAlert.alertId);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(dismissedIds).add(topAlert.alertId);
    setDismissedIds(next);
    saveDismissed(next);
  };

  return (
    <div className={`fraud-banner ${sevClass}`} role="alert" onClick={handleClick} title="View all alerts">
      <button className="fraud-banner-close" onClick={handleDismiss} aria-label="Dismiss">&times;</button>
      <div className="fraud-banner-content">
        <div className="fraud-banner-left">
          <span className="fraud-banner-icon">&#9888;</span>
        </div>
        <div className="fraud-banner-body">
          <div className="fraud-banner-label">{topAlert.severity} Alert</div>
          <div className="fraud-banner-text">
            {topAlert.message}
            {visibleAlerts.length > 1 && (
              <span className="fraud-banner-count">
                +{visibleAlerts.length - 1}
              </span>
            )}
          </div>
        </div>
        <div className="fraud-banner-actions">
          <button className="fraud-banner-btn" onClick={handleAcknowledge}>
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
