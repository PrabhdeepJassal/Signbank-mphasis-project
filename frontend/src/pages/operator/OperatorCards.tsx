import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import { getCards } from '../../api/cardApi';
import type { CardData } from '../../api/cardApi';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './OperatorCards.css';

// ── Bank-style card component ──
function CardVisual({ card, onClick }: { card: CardData; onClick: () => void }) {
  const isBlocked = card.cardStatus === 'BLOCKED';

  // Premium gradient palettes
  const palettes: Record<string, { bg: string; accent: string; glow: string; badge: string }> = {
    CREDIT: {
      bg: 'linear-gradient(145deg, #0c0018 0%, #1e0a3c 35%, #2d1b69 65%, #1a0533 100%)',
      accent: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.15)',
      badge: '#c084fc',
    },
    DEBIT: {
      bg: 'linear-gradient(145deg, #001020 0%, #062145 35%, #0f3b6e 65%, #061e3a 100%)',
      accent: '#60a5fa',
      glow: 'rgba(96, 165, 250, 0.15)',
      badge: '#60a5fa',
    },
  };

  const p = palettes[card.cardType] || palettes.DEBIT;
  const lastFour = card.cardNumber?.replace(/\s/g, '').slice(-4) || '0000';

  return (
    <div className="cb-card" style={{ background: p.bg }} onClick={onClick}>
      {/* Card shine overlay */}
      <div className="cb-card-shine" />

      {/* Top section: chip + brand */}
      <div className="cb-card-top">
        <div className="cb-chip">
          <svg viewBox="0 0 40 30" width="36" height="26">
            <rect x="1" y="1" width="38" height="28" rx="4" fill="#e8c87a" />
            <rect x="6" y="8" width="12" height="8" rx="1" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
            <rect x="22" y="10" width="12" height="4" rx="1" fill="rgba(0,0,0,0.06)" />
          </svg>
        </div>
        <div className="cb-card-brand" style={{ color: p.accent }}>
          <svg viewBox="0 0 50 16" width="50" height="16" fill={p.accent} opacity="0.8">
            <rect x="0" y="2" width="18" height="12" rx="2" />
            <rect x="32" y="2" width="18" height="12" rx="2" />
            <circle cx="25" cy="8" r="6" />
          </svg>
        </div>
      </div>

      {/* Card type label */}
      <div className="cb-card-type">{card.cardType}</div>

      {/* Card number */}
      <div className="cb-card-number">
        <span className="cb-num-block">****</span>
        <span className="cb-num-block">****</span>
        <span className="cb-num-block">****</span>
        <span className="cb-num-block">{lastFour}</span>
      </div>

      {/* Expiry + holder row */}
      <div className="cb-card-meta">
        <div className="cb-meta-item">
          <span className="cb-meta-label">EXPIRY</span>
          <span className="cb-meta-value">12/28</span>
        </div>
        <div className="cb-meta-item">
          <span className="cb-meta-label">HOLDER</span>
          <span className="cb-meta-value">CARDHOLDER</span>
        </div>
      </div>

      {/* Bottom: status + limit */}
      <div className="cb-card-footer">
        <div className="cb-status">
          <span className={`cb-status-ring ${isBlocked ? 'red' : 'green'}`}>
            <span className="cb-status-dot" />
          </span>
          <span className="cb-status-text">{isBlocked ? 'Blocked' : 'Active'}</span>
        </div>
        {card.transactionLimit != null && (
          <div className="cb-limit">
            <span className="cb-limit-label">Limit</span>
            <span className="cb-limit-value">₹{card.transactionLimit.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Glow on hover */}
      <div className="cb-card-glow" style={{ background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)` }} />
    </div>
  );
}

export default function OperatorCards() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');

  const username = currentUser?.username ?? '';

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    getCards(username)
      .then(data => setCards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const creditCards = cards.filter(c => c.cardType === 'CREDIT');
  const debitCards = cards.filter(c => c.cardType === 'DEBIT');

  const displayedCards = activeTab === 'all' ? cards : activeTab === 'credit' ? creditCards : debitCards;

  const handleCardClick = (cardType: string) => {
    navigate(`/operator/card-actions/${cardType}`);
  };

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'BOTH_THUMBS_DOWN') {
      navigate('/');
      return;
    }
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

  const tabCount = (tab: 'all' | 'credit' | 'debit') =>
    tab === 'all' ? cards.length : tab === 'credit' ? creditCards.length : debitCards.length;

  return (
    <div className={`cb-layout page-container ${exiting ? 'page-exit' : ''}`}>
      <header className="cb-header">
        <button className="cb-back" onClick={() => navigate('/operator/dashboard')}>
          ← Back
          <span className="cb-back-hint">🖐️→✊</span>
        </button>
        <div className="cb-header-right">
          <div className="cb-header-title">My Cards</div>
          <div className="cb-header-sub">All your cards in one place</div>
        </div>
      </header>

      <main className="cb-main">
        <div className="cb-wrap">
          <div className="cb-content">
            {/* Account summary */}
            <div className="cb-summary">
              <div className="cb-avatar">{username.charAt(0).toUpperCase()}</div>
              <div className="cb-summary-info">
                <span className="cb-summary-label">Account</span>
                <span className="cb-summary-name">{username}</span>
                <span className="cb-summary-count">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="cb-balance">
                <span className="cb-balance-label">Total Cards</span>
                <span className="cb-balance-num">{cards.length}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="cb-tabs">
              {(['all', 'credit', 'debit'] as const).map(tab => (
                <button
                  key={tab}
                  className={`cb-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'all' ? 'All' : tab === 'credit' ? '💳 Credit' : '🏧 Debit'}
                  <span className="cb-tab-count">{tabCount(tab)}</span>
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="cb-state">
                <div className="cb-spinner" />
                <p>Loading your cards...</p>
              </div>
            )}

            {/* Cards grid */}
            {!loading && displayedCards.length > 0 && (
              <div className="cb-grid">
                {displayedCards.map(card => (
                  <CardVisual key={card.cardId} card={card} onClick={() => handleCardClick(card.cardType)} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && cards.length === 0 && (
              <div className="cb-empty">
                <div className="cb-empty-icon">💳</div>
                <h3>No Cards Found</h3>
                <p>No credit or debit cards are linked to your account yet.</p>
              </div>
            )}

            {!loading && cards.length > 0 && displayedCards.length === 0 && (
              <div className="cb-empty">
                <div className="cb-empty-icon">🔍</div>
                <h3>No {activeTab} Cards</h3>
                <p>You don't have any {activeTab} cards in your account.</p>
              </div>
            )}

            {/* Gesture guide */}
            <div className="cb-guide">
              <div className="cb-guide-row"><span>🤘</span><span>Four Fingers → Credit Card</span></div>
              <div className="cb-guide-row"><span>✌️</span><span>Two Fingers → Debit Card</span></div>
              <div className="cb-guide-row"><span>🖐️→✊</span><span>Open Palm then Fist → Back</span></div>
            </div>
          </div>

          <GestureCamera onGesture={handleGesture} />
        </div>
      </main>
    </div>
  );
}
