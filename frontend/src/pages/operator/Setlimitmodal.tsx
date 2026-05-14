import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyseRotation, setTransactionLimit } from '../../api/gestureApi';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './SetLimitModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pass the latest raw landmarks from GestureCamera */
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  /** Pass gesture events from GestureCamera */
  onGestureForModal: (evt: GestureEvent) => void;
}

const MIN_LIMIT = 500;
const MAX_LIMIT = 100000;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SetLimitModal({ isOpen, onClose, landmarks }: Props) {
  const { currentUser } = useAuth();

  const [limit, setLimit]         = useState(10000);
  const [angleDeg, setAngleDeg]   = useState(0);
  const [direction, setDirection] = useState<'CW' | 'CCW' | 'NEUTRAL'>('NEUTRAL');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestLm = useRef(landmarks);
  useEffect(() => { latestLm.current = landmarks; }, [landmarks]);

  useEffect(() => {
    if (!isOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      const lm = latestLm.current;
      if (!lm || lm.length < 21) return;
      try {
        const res = await analyseRotation({ landmarks: lm });
        setAngleDeg(res.angleDeg);
        setLimit(res.limit);
        setDirection(res.direction);
        setSaveState('idle');
      } catch (_) {
       
      }
    }, 200);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen]);

  const handleConfirm = useCallback(async () => {
    if (saveState === 'saving') return;
    setSaveState('saving');
    setErrorMsg('');
    try {
      await setTransactionLimit({
        userId: currentUser?.username ?? 'unknown',
        limit,
      });
      setSaveState('saved');
      setTimeout(() => { setSaveState('idle'); onClose(); }, 1800);
    } catch (e: any) {
      setSaveState('error');
      setErrorMsg(e?.response?.data?.message ?? 'Failed to save limit');
    }
  }, [limit, currentUser, onClose, saveState]);

  if (!isOpen) return null;

  const percentage = ((limit - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;
  const dirColor = direction === 'CW' ? '#34d399' : direction === 'CCW' ? '#f87171' : '#94a3b8';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        
        <div className="modal-header">
          <span className="modal-title">🔄 Set Transaction Limit</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-limit-display">
          <div className="modal-limit-label">Current Limit</div>
          <div className="modal-limit-amount" style={{ color: dirColor }}>
            ₹ {limit.toLocaleString('en-IN')}.00
          </div>
          <div className="modal-direction-badge" style={{ background: dirColor + '22', border: `1px solid ${dirColor}`, color: dirColor }}>
            {direction === 'CW'      ? '↻ Rotating Clockwise'
            : direction === 'CCW'   ? '↺ Rotating Counter-Clockwise'
            :                         '— Hold still'}
          </div>
        </div>

        <div className="modal-arc-wrap">
          <svg viewBox="0 0 120 70" className="modal-arc-svg">
           
            <path d="M10,65 A55,55 0 0,1 110,65" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round"/>
            <path
              d={describeArc(60, 65, 55, -180, -180 + 180 * (percentage / 100))}
              fill="none"
              stroke={dirColor}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <text x="60" y="58" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="bold">
              {angleDeg.toFixed(0)}°
            </text>
          </svg>
          <div className="modal-arc-labels">
            <span>₹500</span>
            <span>₹1,00,000</span>
          </div>
        </div>

        <div className="modal-bar-track">
          <div className="modal-bar-fill" style={{ width: `${percentage}%`, background: dirColor }} />
        </div>

       
        <div className="modal-details">
          <div className="modal-detail-row"><span>Min</span><span>₹ 500</span></div>
          <div className="modal-detail-row"><span>Max</span><span>₹ 1,00,000</span></div>
          <div className="modal-detail-row"><span>Account</span><span>{currentUser?.username}</span></div>
        </div>

        <button
          className={`modal-confirm-btn ${saveState}`}
          onClick={handleConfirm}
          disabled={saveState === 'saving'}
        >
          {saveState === 'saving' ? '⏳ Saving…'
          : saveState === 'saved' ? '✅ Saved!'
          : saveState === 'error' ? '❌ Retry'
          : '👍 Confirm (Thumb Up)'}
        </button>
        {saveState === 'error' && <div className="modal-error">{errorMsg}</div>}

      
        <div className="modal-guide">
          <span>↻ Rotate hand to adjust</span>
          <span>·</span>
          <span>👍 Thumb Up to confirm</span>
          <span>·</span>
          <span>✕ Click outside to cancel</span>
        </div>

      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M${s.x},${s.y} A${r},${r} 0 ${large},1 ${e.x},${e.y}`;
}