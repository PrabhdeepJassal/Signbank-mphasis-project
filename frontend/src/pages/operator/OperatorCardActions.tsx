import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import { getCards, replaceCard, getReplacementHistory } from '../../api/cardApi';
import type { CardData, ReplacementHistoryEntry } from '../../api/cardApi';
import apiClient from '../../api/client';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './OperatorCardActions.css';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ResultState  = 'idle' | 'loading' | 'success' | 'error';
type ReplaceReason = 'LOST' | 'DAMAGED' | 'STOLEN' | null;
type FlowStep =
  | 'idle'
  | 'block-auth'        // Capture gesture sequence = login credential
  | 'replace-reason'
  | 'replace-confirm';

const REPLACE_REASONS: { value: ReplaceReason; label: string; emoji: string; gesture: string }[] = [
  { value: 'LOST',    label: 'Lost',    emoji: '🔍', gesture: '☝️ One finger' },
  { value: 'DAMAGED', label: 'Damaged', emoji: '💔', gesture: '✌️ Two fingers' },
  { value: 'STOLEN',  label: 'Stolen',  emoji: '🚨', gesture: '🤌 Three fingers' },
];

// Gesture-ID → human label + emoji (mirrors the login screen)
const GESTURE_META: Record<string, { label: string; emoji: string; color: string }> = {
  G001: { label: 'One Finger',   emoji: '☝️', color: '#059669' },
  G002: { label: 'Two Fingers',  emoji: '✌️', color: '#2563eb' },
  G003: { label: 'Three Fingers',emoji: '🤌', color: '#7c3aed' },
  G004: { label: 'Four Fingers', emoji: '🤘', color: '#d97706' },
  G005: { label: 'Open Palm',    emoji: '🖐️', color: '#0891b2' },
};

// Sequence length must match what the user set during first-login
// (system allows 1–4 gesture IDs joined with "-")
const MAX_SEQUENCE = 4;

// ─────────────────────────────────────────────────────────────────────────────
// GestureSequenceDisplay — shows captured gesture IDs as a row of chips
// ─────────────────────────────────────────────────────────────────────────────
function GestureSequenceDisplay({
  sequence,
  maxLen = MAX_SEQUENCE,
  color,
}: {
  sequence: string[];
  maxLen?: number;
  color: string;
}) {
  return (
    <div className="gs-display">
      {/* Filled slots */}
      {sequence.map((gid, i) => {
        const meta = GESTURE_META[gid];
        return (
          <div
            key={i}
            className="gs-chip filled"
            style={{ borderColor: color, background: color + '22' }}
          >
            <span className="gs-chip-emoji">{meta?.emoji ?? '?'}</span>
            <span className="gs-chip-label">{meta?.label ?? gid}</span>
          </div>
        );
      })}
      {/* Empty slots */}
      {Array.from({ length: maxLen - sequence.length }).map((_, i) => (
        <div key={`empty-${i}`} className="gs-chip empty" style={{ borderColor: '#334155' }}>
          <span className="gs-chip-empty-dot" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GestureKeyGrid — shows available gesture keys (reference panel)
// ─────────────────────────────────────────────────────────────────────────────
function GestureKeyGrid({ pressedId }: { pressedId: string | null }) {
  return (
    <div className="gs-key-grid">
      {Object.entries(GESTURE_META).map(([gid, meta]) => (
        <div
          key={gid}
          className={`gs-key ${pressedId === gid ? 'pressed' : ''}`}
          style={{ '--key-color': meta.color } as React.CSSProperties}
        >
          <span className="gs-key-emoji">{meta.emoji}</span>
          <span className="gs-key-name">{meta.label}</span>
          <span className="gs-key-id">{gid}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalCamera — thin wrapper used inside confirm overlays
// ─────────────────────────────────────────────────────────────────────────────
function ModalCamera({ onGesture }: { onGesture: (evt: GestureEvent) => void }) {
  return (
    <div className="modal-camera-wrap">
      <div className="modal-camera-label">
        <span className="modal-cam-dot" /> Live Gesture Camera
      </div>
      <GestureCamera onGesture={onGesture} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BlockAuthModal — captures the user's login gesture sequence (not a new PIN)
// ─────────────────────────────────────────────────────────────────────────────
interface BlockAuthModalProps {
  cardLabel: string;
  cardSymbol: string;
  cardStatus: string;
  sequence: string[];
  lastPressedId: string | null;
  verifying: boolean;
  authError: string | null;
  confidence: number | null;
  onGesture: (evt: GestureEvent) => void;
  onConfirm: () => void;
  onCancel: () => void;
}
function BlockAuthModal({
  cardLabel, cardSymbol, cardStatus,
  sequence, lastPressedId, verifying, authError, confidence,
  onGesture, onConfirm, onCancel,
}: BlockAuthModalProps) {
  const willBlock = cardStatus === 'ACTIVE';
  const color     = willBlock ? '#ef4444' : '#10b981';
  const icon      = willBlock ? '🔒' : '🔓';
  const hasInput  = sequence.length > 0;

  return (
    <div className="confirm-overlay">
      <div className="confirm-box block-auth-box">

        {/* ── Left — camera + key reference ── */}
        <div className="block-auth-left">
          <ModalCamera onGesture={onGesture} />

          {confidence !== null && (
            <div className="confidence-badge">
              <span className="conf-icon">🎯</span>
              <span className="conf-text">Confidence: <strong>{confidence}%</strong></span>
              <div className="conf-bar-wrap">
                <div
                  className="conf-bar-fill"
                  style={{
                    width: `${confidence}%`,
                    background: confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171',
                  }}
                />
              </div>
            </div>
          )}

          <GestureKeyGrid pressedId={lastPressedId} />
        </div>

        {/* ── Right — instructions + sequence display ── */}
        <div className="block-auth-right">
          <div className="confirm-icon" style={{ background: color + '22', border: `2px solid ${color}` }}>
            <span>{icon}</span>
          </div>

          <h2 className="confirm-title">
            {willBlock ? 'Block' : 'Unblock'} {cardLabel}
          </h2>

          <p className="confirm-desc">
            Show the <strong>same gesture sequence</strong> you used when you first logged in.
            This verifies your identity before the card is {willBlock ? 'blocked' : 'unblocked'}.
          </p>

          {/* Card preview */}
          <div className="confirm-card-preview">
            <span className="confirm-card-symbol">{cardSymbol}</span>
            <div>
              <div className="confirm-card-label">{cardLabel}</div>
              <div className={`confirm-card-status ${cardStatus === 'ACTIVE' ? 'active' : 'blocked'}`}>
                Currently {cardStatus}
              </div>
            </div>
          </div>

          {/* Sequence capture display */}
          <div className="auth-sequence-section">
            <div className="auth-sequence-label">
              🔑 Your login gesture sequence
              <span className="auth-seq-hint">({sequence.length}/{MAX_SEQUENCE} entered)</span>
            </div>
            <GestureSequenceDisplay sequence={sequence} color={color} />
            {sequence.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Credential: <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: 4, color: '#a78bfa' }}>
                  {sequence.join('-')}
                </code>
              </div>
            )}
          </div>

          {/* Verifying state */}
          {verifying && (
            <div className="auth-error-banner" style={{ background: '#1e3a5f', borderColor: '#2563eb', color: '#93c5fd' }}>
              <span className="btn-spinner" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #60a5fa44', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <span>Verifying gesture sequence with server…</span>
            </div>
          )}

          {/* Error message — shown prominently after failed attempt */}
          {authError && !verifying && (
            <div className="auth-error-banner" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>❌</span>
                <strong>{authError}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.8, paddingLeft: '1.5rem' }}>
                Enter your gestures again and press 👍 Thumb Up to retry.
              </div>
            </div>
          )}

          {/* Gesture hints */}
          <div className="confirm-gesture-hint">
            <div className="confirm-gesture-item yes">
              <span className="confirm-gesture-icon">👍</span>
              <div>
                <div className="confirm-gesture-label">Thumb Up = Verify &amp; Confirm</div>
                <div className="confirm-gesture-sub">Only works after at least 1 gesture</div>
              </div>
            </div>
            <div className="confirm-gesture-item no">
              <span className="confirm-gesture-icon">🔙</span>
              <div>
                <div className="confirm-gesture-label">Back Dynamic = Cancel / Clear</div>
                <div className="confirm-gesture-sub">Clear sequence or close modal</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="confirm-buttons">
            <button className="confirm-btn-cancel" onClick={onCancel} disabled={verifying}>
              ✕ Cancel
            </button>
            <button
              className="confirm-btn-yes"
              style={{ background: !hasInput || verifying ? '#334155' : color }}
              onClick={onConfirm}
              disabled={!hasInput || verifying}
            >
              {verifying
                ? <><span className="btn-spinner" /> Verifying…</>
                : <>{icon} Confirm</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplaceReasonModal (unchanged from original, just re-typed cleanly)
// ─────────────────────────────────────────────────────────────────────────────
interface ReplaceReasonModalProps {
  cardLabel: string; cardSymbol: string;
  confidence: number | null; onGesture: (evt: GestureEvent) => void;
  onSelect: (reason: ReplaceReason) => void; onCancel: () => void;
}
function ReplaceReasonModal({ cardLabel, cardSymbol, confidence, onGesture, onSelect, onCancel }: ReplaceReasonModalProps) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-box replace-modal-box">
        <div className="replace-modal-left">
          <ModalCamera onGesture={onGesture} />
          {confidence !== null && (
            <div className="confidence-badge">
              <span className="conf-icon">🎯</span>
              <span className="conf-text">Confidence: <strong>{confidence}%</strong></span>
              <div className="conf-bar-wrap">
                <div className="conf-bar-fill" style={{
                  width: `${confidence}%`,
                  background: confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171',
                }} />
              </div>
            </div>
          )}
          <div className="replace-cam-guide">
            <div className="rcg-row"><span>☝️</span><span>Lost</span></div>
            <div className="rcg-row"><span>✌️</span><span>Damaged</span></div>
            <div className="rcg-row"><span>🤌</span><span>Stolen</span></div>
            <div className="rcg-row"><span>✊</span><span>Cancel</span></div>
          </div>
        </div>
        <div className="replace-modal-right">
          <div className="confirm-icon" style={{ background: '#8b5cf622', border: '2px solid #8b5cf6' }}>
            <span>🔄</span>
          </div>
          <h2 className="confirm-title">Replace {cardLabel}</h2>
          <p className="confirm-desc">Select the reason for replacement using gestures or click.</p>
          <div className="confirm-card-preview">
            <span className="confirm-card-symbol">{cardSymbol}</span>
            <div><div className="confirm-card-label">{cardLabel}</div></div>
          </div>
          <div className="replace-reasons-list">
            {REPLACE_REASONS.map(r => (
              <div key={r.value ?? ''} className="replace-reason-item" onClick={() => onSelect(r.value)}>
                <span className="replace-reason-emoji">{r.emoji}</span>
                <div className="replace-reason-info">
                  <div className="replace-reason-label">{r.label}</div>
                  <div className="replace-reason-gesture">{r.gesture}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="confirm-btn-cancel" style={{ width: '100%', marginTop: '0.5rem' }} onClick={onCancel}>
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplaceConfirmModal
// ─────────────────────────────────────────────────────────────────────────────
interface ReplaceConfirmModalProps {
  cardLabel: string; cardSymbol: string; reason: ReplaceReason;
  confidence: number | null; onGesture: (evt: GestureEvent) => void;
  onConfirm: () => void; onCancel: () => void;
}
function ReplaceConfirmModal({ cardLabel, cardSymbol, reason, confidence, onGesture, onConfirm, onCancel }: ReplaceConfirmModalProps) {
  const r = REPLACE_REASONS.find(x => x.value === reason);
  return (
    <div className="confirm-overlay">
      <div className="confirm-box replace-modal-box">
        <div className="replace-modal-left">
          <ModalCamera onGesture={onGesture} />
          {confidence !== null && (
            <div className="confidence-badge">
              <span className="conf-icon">🎯</span>
              <span className="conf-text">Confidence: <strong>{confidence}%</strong></span>
              <div className="conf-bar-wrap">
                <div className="conf-bar-fill" style={{
                  width: `${confidence}%`,
                  background: confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171',
                }} />
              </div>
            </div>
          )}
          <div className="replace-cam-guide">
            <div className="rcg-row"><span>👍</span><span>Confirm</span></div>
            <div className="rcg-row"><span>👎</span><span>Cancel</span></div>
          </div>
        </div>
        <div className="replace-modal-right">
          <div className="confirm-icon" style={{ background: '#8b5cf622', border: '2px solid #8b5cf6' }}>
            <span>🔄</span>
          </div>
          <h2 className="confirm-title">Confirm Replacement</h2>
          <p className="confirm-desc">
            A new {cardLabel} will be issued. Your current card will be deactivated once the new card arrives.
          </p>
          <div className="confirm-card-preview">
            <span className="confirm-card-symbol">{cardSymbol}</span>
            <div>
              <div className="confirm-card-label">{cardLabel}</div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Reason: {r?.emoji} {r?.label}
              </div>
            </div>
          </div>
          <div className="replace-delivery-info">
            <div className="delivery-row"><span>📍 Delivery address</span><span>Registered address on file</span></div>
            <div className="delivery-row"><span>📅 Estimated arrival</span><span>5–7 business days</span></div>
          </div>
          <div className="confirm-gesture-hint">
            <div className="confirm-gesture-item yes">
              <span className="confirm-gesture-icon">👍</span>
              <div><div className="confirm-gesture-label">Thumb Up = Confirm</div></div>
            </div>
            <div className="confirm-gesture-item no">
              <span className="confirm-gesture-icon">👎</span>
              <div><div className="confirm-gesture-label">Thumb Down = Cancel</div></div>
            </div>
          </div>
          <div className="confirm-buttons">
            <button className="confirm-btn-cancel" onClick={onCancel}>✕ Cancel</button>
            <button className="confirm-btn-yes" style={{ background: '#8b5cf6' }} onClick={onConfirm}>
              👍 Confirm Replacement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplacementHistory
// ─────────────────────────────────────────────────────────────────────────────
function ReplacementHistory({ entries, loading }: { entries: ReplacementHistoryEntry[]; loading: boolean }) {
  if (loading) return (
    <div className="replacement-history">
      <h2 className="actions-section-title">📋 Replacement History</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', padding: '1rem 0' }}>Loading history…</p>
    </div>
  );
  if (!entries.length) return null;

  const statusColor: Record<string, string> = {
    Processing: '#f59e0b', Shipped: '#60a5fa', Delivered: '#34d399',
  };
  const reasonEmoji: Record<string, string> = {
    LOST: '🔍', DAMAGED: '💔', STOLEN: '🚨', UNSPECIFIED: '📋',
  };

  return (
    <div className="replacement-history">
      <h2 className="actions-section-title">📋 Replacement History</h2>
      <div className="rh-list">
        {entries.map(e => (
          <div key={e.replacementId} className="rh-entry">
            <span className="rh-emoji">{reasonEmoji[e.reason] ?? '📋'}</span>
            <div className="rh-info">
              <div className="rh-reason">{e.reason} replacement — {e.cardType}</div>
              <div className="rh-date">{new Date(e.requestedAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</div>
            </div>
            <span className="rh-status" style={{ color: statusColor[e.status] ?? '#94a3b8' }}>
              {e.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultBanner
// ─────────────────────────────────────────────────────────────────────────────
function ResultBanner({ state, message }: { state: ResultState; message: string }) {
  if (state === 'idle') return null;
  return (
    <div className={`result-banner result-${state}`}>
      <div className="result-icon">
        {state === 'loading' && <div className="result-spinner" />}
        {state === 'success' && <span>✅</span>}
        {state === 'error'   && <span>❌</span>}
      </div>
      <div className="result-text">
        <div className="result-title">
          {state === 'loading' && 'Processing…'}
          {state === 'success' && 'Success!'}
          {state === 'error'   && 'Failed'}
        </div>
        <div className="result-msg">{message}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OperatorCardActions() {
  const { currentUser } = useAuth();
  const navigate  = useNavigate();
  const { cardType } = useParams<{ cardType: string }>();

  const username   = currentUser?.username ?? 'default';
  const cardLabel  = cardType === 'CREDIT' ? 'Credit Card' : 'Debit Card';
  const cardSymbol = cardType === 'CREDIT' ? '💳' : '🏧';

  const [card, setCard]                   = useState<CardData | null>(null);
  const [flowStep, setFlowStep]           = useState<FlowStep>('idle');
  const [replaceReason, setReplaceReason] = useState<ReplaceReason>(null);
  const [resultState, setResultState]     = useState<ResultState>('idle');
  const [resultMsg, setResultMsg]         = useState('');
  const [confidence, setConfidence]       = useState<number | null>(null);
  const [exiting, setExiting]             = useState(false);

  // Gesture-sequence auth state (replaces the old PIN buffer)
  const [authSequence, setAuthSequence]     = useState<string[]>([]);   // e.g. ['G001','G003']
  const [lastPressedId, setLastPressedId]   = useState<string | null>(null);
  const [verifying, setVerifying]           = useState(false);
  const [authError, setAuthError]           = useState<string | null>(null);

  // Replacement history
  const [replacementHistory, setReplacementHistory] = useState<ReplacementHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading]         = useState(false);

  // Stable refs for gesture closures
  const flowStepRef      = useRef<FlowStep>('idle');
  const authSequenceRef  = useRef<string[]>([]);
  const replaceReasonRef = useRef<ReplaceReason>(null);
  const waveXHistory     = useRef<number[]>([]);
  const waveCountRef     = useRef(0);
  const justTransRef     = useRef(false);

  const setFlowBoth    = (s: FlowStep)      => { flowStepRef.current = s;     setFlowStep(s); };
  const setSeqBoth     = (seq: string[])    => { authSequenceRef.current = seq; setAuthSequence(seq); };
  const setReasonBoth  = (r: ReplaceReason) => { replaceReasonRef.current = r; setReplaceReason(r); };

  // ── Load card + history ───────────────────────────────────────────────────
  useEffect(() => {
    getCards(username).then(cards => {
      const found = cards.find(c => c.cardType === cardType);
      if (found) setCard(found);
    }).catch(() => {});

    setHistoryLoading(true);
    getReplacementHistory(username, cardType)
      .then(setReplacementHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [username, cardType]);

  // ── Execute block with credential ────────────────────────────────────────
  // Keeps modal open on 401 (wrong password) so user can retry.
  // Does NOT touch resultState while modal is open — avoids UI conflicts.
  const executeBlock = useCallback(async (credential: string, currentCardStatus: string) => {
    console.log('[executeBlock] credential=', credential, 'username=', username, 'cardType=', cardType);
    try {
      const res = await apiClient.post<CardData>(
        '/api/operator/cards/toggle-block',
        null,
        { params: { username, cardType, credential } }
      );
      const updated: CardData = res.data;
      // Success — close modal and show result banner
      setFlowBoth('idle');
      setSeqBoth([]);
      setAuthError(null);
      setCard(updated);
      setResultState('success');
      setResultMsg(updated.message ?? (currentCardStatus === 'ACTIVE' ? `${cardLabel} blocked successfully` : `${cardLabel} unblocked successfully`));
      setTimeout(() => { setResultState('idle'); setResultMsg(''); }, 5000);
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMsg: string = e?.response?.data?.error ?? e?.response?.data?.message ?? '';
      console.error('[executeBlock] error status=', status, 'msg=', serverMsg);

      if (status === 401) {
        // Wrong password — keep modal open, show error, clear sequence so user retries
        setAuthError('❌ Wrong gesture password. Enter the same gestures you used to log in.');
        setSeqBoth([]);
        // Do NOT close modal or touch resultState
      } else if (status === 404) {
        setAuthError('❌ User not found. Please log out and log in again.');
        setSeqBoth([]);
      } else {
        // Unexpected error — close modal and show on main page
        setFlowBoth('idle');
        setSeqBoth([]);
        setAuthError(null);
        setResultState('error');
        setResultMsg(serverMsg || 'Operation failed. Please try again.');
      }
    }
  }, [cardType, cardLabel, username]);

  // ── Execute replace ───────────────────────────────────────────────────────
  const executeReplace = useCallback(async () => {
    const reason = replaceReasonRef.current;
    setFlowBoth('idle');
    setResultState('loading');
    setResultMsg(`Requesting ${cardLabel} replacement…`);
    try {
      const updated: CardData = await replaceCard(username, cardType!, { reason });
      setCard(updated);
      setResultState('success');
      setResultMsg(updated.message ?? 'Replacement request submitted successfully');
      getReplacementHistory(username, cardType).then(setReplacementHistory).catch(() => {});
      setReasonBoth(null);
      setTimeout(() => { setResultState('idle'); setResultMsg(''); }, 5000);
    } catch (e: any) {
      setResultState('error');
      setResultMsg(e?.response?.data?.message ?? 'Operation failed. Please try again.');
    }
  }, [cardType, cardLabel, username]);

  // ── Submit gesture sequence as credential ────────────────────────────────
  // Reads current card status from the card state ref to pass into executeBlock.
  const cardRef = useRef<CardData | null>(null);
  useEffect(() => { cardRef.current = card; }, [card]);

  const handleVerifyAndBlock = useCallback(async () => {
    const seq = authSequenceRef.current;
    if (!seq.length) return;

    setVerifying(true);
    setAuthError(null);

    // Join gesture IDs with "-" — same format as stored by set-password
    const credential = seq.join('-');
    const currentStatus = cardRef.current?.cardStatus ?? 'ACTIVE';

    await executeBlock(credential, currentStatus);
    setVerifying(false);
  }, [executeBlock]);

  // ── Main gesture handler ──────────────────────────────────────────────────
  const handleGesture = useCallback((evt: GestureEvent) => {
    const step = flowStepRef.current;
    const seq  = authSequenceRef.current;

    if ('confidence' in evt && typeof evt.confidence === 'number') {
      setConfidence(evt.confidence);
    }

    // Wave → logout
    if (evt.type === 'SLIDER_ACTIVE') {
      const hist = waveXHistory.current;
      hist.push(evt.normX);
      if (hist.length > 30) hist.shift();
      if (hist.length >= 8) {
        let dirChanges = 0;
        for (let i = 2; i < hist.length; i++) {
          const prev = hist[i - 1] - hist[i - 2];
          const curr = hist[i] - hist[i - 1];
          if (Math.sign(prev) !== Math.sign(curr) && Math.abs(curr) > 0.06) dirChanges++;
        }
        if (dirChanges >= 5) {
          waveCountRef.current++;
          if (waveCountRef.current >= 2) navigate('/');
        } else {
          waveCountRef.current = 0;
        }
      }
      return;
    }

    // BACK_DYNAMIC from idle → go back to cards list
    if (evt.type === 'BACK_DYNAMIC' && step === 'idle') {
      setExiting(true);
      setTimeout(() => navigate('/operator/cards'), 300);
      return;
    }

    // ── block-auth step: capture gesture sequence ────────────────────────
    if (step === 'block-auth') {
      // Skip the first event fired right after modal opens (avoids ghost trigger)
      if (justTransRef.current) { justTransRef.current = false; return; }

      if (evt.type === 'GESTURE_ID') {
        // Flash the pressed key in the grid
        setLastPressedId(evt.id);
        setTimeout(() => setLastPressedId(null), 600);

        if (seq.length < MAX_SEQUENCE) {
          const newSeq = [...seq, evt.id];
          setSeqBoth(newSeq);
        }
        return;
      }

      if (evt.type === 'THUMB_UP') {
        // Thumb up = submit sequence as credential
        handleVerifyAndBlock();
        return;
      }

      if (evt.type === 'BACK_DYNAMIC') {
        if (seq.length > 0) {
          // First back = clear last gesture (backspace)
          const newSeq = seq.slice(0, -1);
          setSeqBoth(newSeq);
          setAuthError(null);
        } else {
          // Second back (empty sequence) = cancel modal
          setFlowBoth('idle');
          setAuthError(null);
        }
        return;
      }
      return;
    }

    // ── replace-reason step ──────────────────────────────────────────────
    if (step === 'replace-reason') {
      if (evt.type === 'GESTURE_ID') {
        if (evt.id === 'G001') { setReasonBoth('LOST');    setFlowBoth('replace-confirm'); return; }
        if (evt.id === 'G002') { setReasonBoth('DAMAGED'); setFlowBoth('replace-confirm'); return; }
        if (evt.id === 'G003') { setReasonBoth('STOLEN');  setFlowBoth('replace-confirm'); return; }
      }
      if (evt.type === 'BACK_DYNAMIC') { setFlowBoth('idle'); return; }
      return;
    }

    // ── replace-confirm step ─────────────────────────────────────────────
    if (step === 'replace-confirm') {
      if (evt.type === 'THUMB_UP')    { executeReplace(); return; }
      if (evt.type === 'BACK_DYNAMIC') { setFlowBoth('idle'); setReasonBoth(null); return; }
      return;
    }

    // ── idle: main page navigation gestures ─────────────────────────────
    if (evt.type === 'GESTURE_ID') {
      switch (evt.id) {
        case 'G001':
          navigate(`/operator/set-limit/${cardType}`);
          break;
        case 'G002':
          setFlowBoth('block-auth');
          setSeqBoth([]);
          setAuthError(null);
          justTransRef.current = true;
          break;
        case 'G003':
          setFlowBoth('replace-reason');
          break;
      }
    }
  }, [executeReplace, handleVerifyAndBlock, navigate, cardType]);

  const isBlocked = card?.cardStatus === 'BLOCKED';

  const actions = [
    {
      id: 'set-limit', label: 'Set Transaction Limit', symbol: '☝️',
      gesture: cardType === 'CREDIT' ? 'One Finger (Credit)' : 'One Finger (Debit)',
      gestureEmoji: '☝️',
      accent: '#059669', bg: '#f0fdf4',
      desc: 'Adjust the spending limit for this card',
      onClick: () => navigate(`/operator/set-limit/${cardType}`),
    },
    {
      id: 'block', label: isBlocked ? 'Unblock Card' : 'Block Card',
      symbol: isBlocked ? '🔓' : '🔒',
      gesture: 'Two Fingers', gestureEmoji: '✌️',
      accent: isBlocked ? '#10b981' : '#ef4444',
      bg: isBlocked ? '#f0fdf4' : '#fef2f2',
      desc: isBlocked
        ? 'Reactivate card — allow transactions again'
        : 'Immediately stop all transactions on this card',
      onClick: () => {
        setFlowBoth('block-auth');
        setSeqBoth([]);
        setAuthError(null);
      },
    },
    {
      id: 'replace', label: 'Replace Card', symbol: '🔄',
      gesture: 'Three Fingers', gestureEmoji: '🤌',
      accent: '#7c3aed', bg: '#faf5ff',
      desc: 'Request a new physical card to be issued',
      onClick: () => setFlowBoth('replace-reason'),
    },
  ];

  return (
    <div className={`card-actions-layout page-container ${exiting ? 'page-exit' : ''}`}>

      {/* ── Modals ── */}
      {flowStep === 'block-auth' && card && (
        <BlockAuthModal
          cardLabel={cardLabel} cardSymbol={cardSymbol} cardStatus={card.cardStatus}
          sequence={authSequence} lastPressedId={lastPressedId}
          verifying={verifying} authError={authError} confidence={confidence}
          onGesture={handleGesture}
          onConfirm={handleVerifyAndBlock}
          onCancel={() => { setFlowBoth('idle'); setSeqBoth([]); setAuthError(null); }}
        />
      )}
      {flowStep === 'replace-reason' && card && (
        <ReplaceReasonModal
          cardLabel={cardLabel} cardSymbol={cardSymbol}
          confidence={confidence} onGesture={handleGesture}
          onSelect={r => { setReasonBoth(r); setFlowBoth('replace-confirm'); }}
          onCancel={() => setFlowBoth('idle')}
        />
      )}
      {flowStep === 'replace-confirm' && card && (
        <ReplaceConfirmModal
          cardLabel={cardLabel} cardSymbol={cardSymbol} reason={replaceReason}
          confidence={confidence} onGesture={handleGesture}
          onConfirm={executeReplace}
          onCancel={() => { setFlowBoth('idle'); setReasonBoth(null); }}
        />
      )}

      {/* ── Header ── */}
      <header className="card-actions-header">
        <button className="card-actions-back-btn" onClick={() => navigate('/operator/cards')}>
          ← Back
          <span className="gesture-hint back-gesture-hint">
            <span className="back-gesture-anim">🖐️✊</span> Open→Fist
          </span>
        </button>
        <div className="card-actions-brand">
          <span className="card-actions-title">User</span>
          <span className="card-actions-sub">{cardLabel} Actions</span>
        </div>
        <div />
      </header>

      {/* ── Main ── */}
      <main className="card-actions-main">
        <div className="card-actions-page">
          <div className="card-actions-panel">

            {/* Card info */}
            <div className="card-info-card">
              <div className="card-info-symbol">{cardSymbol}</div>
              <div className="card-info-details">
                <div className="card-info-type">{cardLabel}</div>
                <div className="card-info-number">{card?.cardNumber ?? '**** **** **** ----'}</div>
                <div className={`card-info-status ${isBlocked ? 'blocked' : 'active'}`}>
                  {isBlocked ? '🔒 Blocked' : '✅ Active'}
                </div>
                {card?.replaceRequested && (
                  <div className="card-replace-tag">🔄 Replacement Requested</div>
                )}
              </div>
            </div>

            <ResultBanner state={resultState} message={resultMsg} />

            <h2 className="actions-section-title">Available Actions</h2>
            <div className="action-command-list">
              {actions.map(action => (
                <div
                  key={action.id} className="action-command-card"
                  style={{ background: action.bg, borderLeft: `4px solid ${action.accent}` }}
                  onClick={action.onClick}
                >
                  <div className="action-cmd-dot" style={{ background: action.accent }} />
                  <div className="action-cmd-info">
                    <div className="action-cmd-name">{action.label}</div>
                    <div className="action-cmd-desc">{action.desc}</div>
                    <div className="action-cmd-gesture">Gesture: <strong>{action.gesture}</strong></div>
                  </div>
                  <div className="action-cmd-symbol">{action.gestureEmoji}</div>
                </div>
              ))}
            </div>

            <ReplacementHistory entries={replacementHistory} loading={historyLoading} />
          </div>

          {flowStep === 'idle' && (
            <div className="camera-section">
              <GestureCamera onGesture={handleGesture} />
              <div className="card-actions-guide">
                <div className="guide-item">
                  <span>{cardType === 'CREDIT' ? '☝️' : '✌️'}</span>
                  <span>{cardType === 'CREDIT' ? 'One Finger' : 'Two Fingers'} → Open {cardLabel}</span>
                </div>
                <div className="guide-item">
                  <span>✌️</span>
                  <span>Two Fingers → {isBlocked ? 'Unblock' : 'Block'} Card (login credential required)</span>
                </div>
                <div className="guide-item">
                  <span>🤌</span>
                  <span>Three Fingers → Replace Card</span>
                </div>
                <div className="guide-item back-guide">
                  <span className="back-guide-icon">🖐️→✊</span>
                  <span>Open Palm then Fist → Back to Cards</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
