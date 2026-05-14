import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './OperatorCards.css';

const CARDS = [
  {
    id: 'CREDIT',
    label: 'Credit Card',
    symbol: '💳',
    gesture: 'Four Fingers',
    gestureId: 'G004',
    accent: '#7c3aed',
    bg: '#faf5ff',
    desc: 'Manage your credit card settings',
  },
  {
    id: 'DEBIT',
    label: 'Debit Card',
    symbol: '🏧',
    gesture: 'Two Fingers',
    gestureId: 'G002',
    accent: '#2563eb',
    bg: '#eff6ff',
    desc: 'Manage your debit card settings',
  },
];

export default function OperatorCards() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  const handleCommandClick = (cardType: string) => {
    navigate(`/operator/card-actions/${cardType}`);
  };

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'BACK_DYNAMIC') {
      setExiting(true);
      setTimeout(() => navigate('/operator/dashboard'), 300);
      return;
    }
    if (evt.type === 'GESTURE_ID' && evt.id === 'G004') {
      navigate('/operator/card-actions/CREDIT');
      return;
    }
    if (evt.type === 'GESTURE_ID' && evt.id === 'G002') {
      navigate('/operator/card-actions/DEBIT');
      return;
    }
  }, [navigate]);

  return (
    <div className={`cards-layout page-container ${exiting ? 'page-exit' : ''}`}>
      <header className="cards-header">
        <button className="cards-back-btn" onClick={() => navigate('/operator/dashboard')}>
          ← Back
          <span className="gesture-hint">🖐️→✊ Open→Fist</span>
        </button>
        <div className="cards-brand">
          {/* Task 4: Changed "Operator" → "User" */}
          <span className="cards-title">User</span>
          <span className="cards-sub">Check Cards</span>
        </div>
        <div />
      </header>

      <main className="cards-main">
        <div className="cards-page">
          <div className="cards-panel">
            <div className="cards-user-info">
              <div className="cards-user-label">Account</div>
              <div className="cards-user-name">{currentUser?.username}</div>
            </div>

            <h2 className="cards-section-title">Select Card Type</h2>

            <div className="card-command-list">
              {CARDS.map((card) => (
                <div
                  key={card.id}
                  className="card-command-card"
                  style={{ background: card.bg, borderLeft: `4px solid ${card.accent}` }}
                  onClick={() => handleCommandClick(card.id)}
                >
                  <div className="card-cmd-dot" style={{ background: card.accent }} />
                  <div className="card-cmd-info">
                    <div className="card-cmd-name">{card.label}</div>
                    <div className="card-cmd-desc">{card.desc}</div>
                    <div className="card-cmd-gesture">
                      Gesture: <strong>{card.gesture}</strong>
                    </div>
                  </div>
                  <div className="card-cmd-symbol">{card.symbol}</div>
                </div>
              ))}
            </div>

            <div className="cards-gesture-guide">
              <div className="guide-item"><span>🤘</span><span>Four Fingers → Credit Card</span></div>
              <div className="guide-item"><span>✌️</span><span>Two Fingers → Debit Card</span></div>
              <div className="guide-item"><span>🖐️→✊</span><span>Open Palm then Fist → Back to Dashboard</span></div>
            </div>
          </div>

          <GestureCamera onGesture={handleGesture} />
        </div>
      </main>
    </div>
  );
}
