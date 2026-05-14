import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './OperatorBalance.css';

export default function OperatorBalance() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'BACK_DYNAMIC') {
      setExiting(true);
      setTimeout(() => navigate('/operator/dashboard'), 300);
    }
  }, [navigate]);

  return (
    <div className={`balance-layout page-container ${exiting ? 'page-exit' : ''}`}>
      <header className="balance-header">
        <button className="balance-back-btn" onClick={() => navigate('/operator/dashboard')}>
          ← Back <span className="gesture-hint">🤌 Three Fingers</span>
        </button>
        <div className="balance-brand">
          {/* Task 4: Changed "Operator" → "User" */}
          <span className="balance-title">User</span>
          <span className="balance-sub">Balance Page</span>
        </div>
        <div />
      </header>
      <main className="balance-main">
        <div className="balance-page">
          <div className="balance-panel">
            <div className="balance-card">
              <div className="balance-label">Account Balance</div>
              <div className="balance-amount">₹ 700,00,00,000.00</div>
              <div className="balance-user">Account: {currentUser?.username}</div>
            </div>
            <div className="balance-details">
              <div className="detail-row"><span>Available Balance</span><span className="green">₹ 700,00,00,000.00</span></div>
              <div className="detail-row"><span>Pending</span><span className="orange">₹ 20,00,000.00</span></div>
              <div className="detail-row"><span>Last Transaction</span><span>₹ 50,000.00</span></div>
            </div>
          </div>
          <GestureCamera onGesture={handleGesture} />
        </div>
      </main>
    </div>
  );
}
