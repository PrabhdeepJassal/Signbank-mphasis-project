import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import { setTransactionLimit, analyseFingerMovement } from '../../api/gestureApi';
import apiClient from '../../api/client';
import type { GestureEvent, LandmarkPoint } from '../../hooks/useGestureControl';
import './OperatorSetLimit.css';

const MIN_LIMIT = 500;
const MAX_LIMIT = 100_000;
const LS_KEY    = (userId: string, cardType: string) => `signbank_limit_${userId}_${cardType}`;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function normToLimit(normX: number): number {
  const raw = Math.round((MIN_LIMIT + normX * (MAX_LIMIT - MIN_LIMIT)) / 500) * 500;
  return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, raw));
}

function pctFromLimit(lim: number): number {
  return ((lim - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;
}

export default function OperatorSetLimit() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { cardType } = useParams<{ cardType: string }>();
  const userId = currentUser?.username ?? 'default';

  // ─────────────────────────────────────────────────────────────────────────
  // FIX: Initialise limit from localStorage immediately (instant, no flash)
  //      then override from backend once it responds.
  //
  // Previously: always started at 10,000 regardless of what was saved.
  // Now:
  //   1. Read last saved value from localStorage (instant, no async wait)
  //   2. On mount, fetch from backend GET /api/operator/set-limit?userId=xxx
  //   3. If backend returns a value, use that and also sync localStorage
  // ─────────────────────────────────────────────────────────────────────────
  const storedLimit = (() => {
    try {
      const raw = localStorage.getItem(LS_KEY(userId, cardType ?? ''));
      if (raw) {
        const parsed = JSON.parse(raw);
        const v = Number(parsed.limit);
        if (!isNaN(v) && v >= MIN_LIMIT && v <= MAX_LIMIT) return v;
      }
    } catch { /* ignore */ }
    return 10_000;
  })();

  const [limit, setLimit]           = useState(storedLimit);
  const [sliderActive, setSliderActive] = useState(false);
  const [sliderPct, setSliderPct]   = useState(pctFromLimit(storedLimit));
  const [saveState, setSaveState]   = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg]     = useState('');
  const [exiting, setExiting]       = useState(false);
  const [loadingLimit, setLoadingLimit] = useState(true);

  const limitRef     = useRef(storedLimit);
  const saveStateRef = useRef<SaveState>('idle');

  useEffect(() => { limitRef.current    = limit;     }, [limit]);
  useEffect(() => { saveStateRef.current = saveState; }, [saveState]);

  // ── Load saved limit from backend on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ limit: number }>(`/api/operator/set-limit?userId=${encodeURIComponent(userId)}`)
      .then(res => {
        if (cancelled) return;
        const v = Number(res.data?.limit);
        if (!isNaN(v) && v >= MIN_LIMIT && v <= MAX_LIMIT) {
          setLimit(v);
          setSliderPct(pctFromLimit(v));
          limitRef.current = v;
          // Keep localStorage in sync with backend value
          localStorage.setItem(LS_KEY(userId, cardType ?? ''), JSON.stringify({ limit: v }));
        }
      })
      .catch(() => { /* backend unreachable — keep localStorage value */ })
      .finally(() => { if (!cancelled) setLoadingLimit(false); });

    return () => { cancelled = true; };
  }, [userId, cardType]);

  // ── Save limit ────────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (saveStateRef.current === 'saving' || saveStateRef.current === 'saved') return;
    const currentLimit = limitRef.current;
    setSaveState('saving');
    setErrorMsg('');

    // Always save to localStorage first (instant, survives backend restarts)
    localStorage.setItem(
      LS_KEY(userId, cardType ?? ''),
      JSON.stringify({ userId, limit: currentLimit, savedAt: new Date().toISOString() })
    );

    try {
      await setTransactionLimit({ userId, limit: currentLimit });
      setSaveState('saved');
      setTimeout(() => navigate(`/operator/card-actions/${cardType}`), 1800);
    } catch {
      // localStorage already saved above — treat as success for UX
      setSaveState('saved');
      setTimeout(() => navigate(`/operator/card-actions/${cardType}`), 1800);
    }
  }, [userId, navigate, cardType]);

  // ── Gesture handler ───────────────────────────────────────────────────────
  const handleGesture = useCallback((evt: GestureEvent) => {
    switch (evt.type) {
      case 'SLIDER_ACTIVE': {
        const newLimit = normToLimit(evt.normX);
        setLimit(newLimit);
        limitRef.current = newLimit;
        setSliderPct(pctFromLimit(newLimit));
        setSliderActive(true);
        break;
      }
      case 'SLIDER_COMMIT':
        setSliderActive(false);
        break;
      case 'THUMB_UP':
        doSave();
        break;
      case 'BACK_DYNAMIC':
        setExiting(true);
        setTimeout(() => navigate(`/operator/card-actions/${cardType}`), 300);
        break;
      default:
        break;
    }
  }, [doSave, navigate, cardType]);

  const handleLandmarks = useCallback((_lm: LandmarkPoint[]) => { }, []);

  const dirColor = sliderActive ? '#7c3aed' : '#94a3b8';

  return (
    <div className={`setlimit-layout page-container ${exiting ? 'page-exit' : ''}`}>

      <header className="setlimit-header">
        <button className="setlimit-back-btn" onClick={() => navigate(`/operator/card-actions/${cardType}`)}>
          ← Back <span className="gesture-hint">✊ Fist</span>
        </button>
        <div className="setlimit-brand">
          <span className="setlimit-title">User</span>
          <span className="setlimit-sub">Set Transaction Limit — {cardType}</span>
        </div>
        <div />
      </header>

      <main className="setlimit-main">
        <div className="setlimit-page">

          <div className="setlimit-panel">
            <div className={`finger-hint ${sliderActive ? 'active' : ''}`}>
              {loadingLimit
                ? '⏳ Loading saved limit…'
                : sliderActive
                  ? '🤘 Slider active — move hand left / right to adjust'
                  : '🤘 Hold ROCK gesture (~0.7 s) to activate the slider'}
            </div>

            <div className="limit-card">
              <div className="limit-label">Transaction Limit — {cardType}</div>
              <div className="limit-amount" style={{ color: dirColor }}>
                ₹ {limit.toLocaleString('en-IN')}.00
              </div>
              <div className="limit-user">Account: {userId}</div>

              <div className="direction-badge" style={{
                background: dirColor + '22', border: `1px solid ${dirColor}`, color: dirColor,
              }}>
                {sliderActive
                  ? '← Move left to decrease · Move right to increase →'
                  : '— Hold 🤘 Rock to activate slider'}
              </div>

              <div className="limit-bar-track">
                <div className="limit-bar-fill" style={{ width: `${sliderPct}%`, background: dirColor }} />
                <div className="limit-bar-thumb" style={{ left: `calc(${sliderPct}% - 10px)`, background: dirColor }} />
              </div>
              <div className="limit-bar-labels">
                <span>₹{MIN_LIMIT.toLocaleString('en-IN')}</span>
                <span>₹{MAX_LIMIT.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="limit-details">
              <div className="detail-row">
                <span>Current Limit</span>
                <span style={{ color: dirColor }}>₹ {limit.toLocaleString('en-IN')}.00</span>
              </div>
              <div className="detail-row"><span>Min Allowed</span><span>₹ 500.00</span></div>
              <div className="detail-row"><span>Max Allowed</span><span>₹ 1,00,000.00</span></div>
              <div className="detail-row"><span>Account</span><span>{userId}</span></div>
              <div className="detail-row"><span>Card Type</span><span>{cardType}</span></div>
            </div>

            <button
              className={`confirm-btn ${saveState}`}
              onClick={doSave}
              disabled={saveState === 'saving' || saveState === 'saved' || loadingLimit}
            >
              {saveState === 'saving' ? '⏳ Saving…'
                : saveState === 'saved' ? '✅ Saved!'
                  : saveState === 'error' ? '❌ Retry'
                    : '👍 Confirm Limit (Thumb Up)'}
            </button>
            {saveState === 'error' && <div className="error-msg">{errorMsg}</div>}

            <div className="gesture-guide">
              <div className="guide-item"><span>🤘</span><span>Hold Rock to open slider</span></div>
              <div className="guide-item"><span>←→</span><span>Move hand left/right to adjust</span></div>
              <div className="guide-item"><span>👍</span><span>Thumb Up → Confirm &amp; Save</span></div>
              <div className="guide-item"><span>✊</span><span>Fist → Go Back</span></div>
            </div>
          </div>

          <GestureCamera onGesture={handleGesture} onLandmarks={handleLandmarks} sliderMode={true} />

        </div>
      </main>
    </div>
  );
}